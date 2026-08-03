import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Persona, PersonaStatus, PersonaVisibility } from '../models/persona.model';
import { PersonaKnowledgeBase } from '../models/persona-knowledge-base.model';
import { PersonaPermission, AccessLevel } from '../models/persona-permission.model';
import { KnowledgeBase } from '../models/knowledge-base.model';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { SharePersonaDto, AssignKnowledgeBaseDto } from './dto/share-persona.dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class PersonaService {
  private readonly logger = new Logger(PersonaService.name);

  constructor(
    @InjectModel(Persona)
    private personaModel: typeof Persona,
    @InjectModel(PersonaKnowledgeBase)
    private personaKnowledgeBaseModel: typeof PersonaKnowledgeBase,
    @InjectModel(PersonaPermission)
    private personaPermissionModel: typeof PersonaPermission,
    @InjectModel(KnowledgeBase)
    private knowledgeBaseModel: typeof KnowledgeBase,
  ) {}

  async create(
    createDto: CreatePersonaDto,
    userId: string,
    organizationId: string,
  ): Promise<Persona> {
    try {
      const { knowledge_base_ids, ...personaData } = createDto;

      const persona = await this.personaModel.create({
        ...personaData,
        created_by: userId,
        organization_id: organizationId,
      });

      if (knowledge_base_ids && knowledge_base_ids.length > 0) {
        await this.assignKnowledgeBases(persona.id, knowledge_base_ids, userId, organizationId);
      }

      this.logger.log(`Persona created: ${persona.id} for organization ${organizationId}`);

      return this.findOne(persona.id, userId, organizationId);
    } catch (error) {
      this.logger.error('Failed to create persona', error);
      throw error;
    }
  }

  async findAll(userId: string, organizationId: string): Promise<Persona[]> {
    try {
      const personas = await this.personaModel.findAll({
        where: { organization_id: organizationId },
        include: [
          {
            model: KnowledgeBase,
            as: 'knowledgeBases',
            through: { attributes: ['priority', 'is_active'] },
          },
        ],
        order: [['created_at', 'DESC']],
      });

      return personas;
    } catch (error) {
      this.logger.error('Failed to fetch personas', error);
      throw error;
    }
  }

  async findOne(id: string, userId: string, organizationId: string): Promise<Persona> {
    try {
      const persona = await this.personaModel.findOne({
        where: {
          id,
          organization_id: organizationId,
        },
        include: [
          {
            model: KnowledgeBase,
            as: 'knowledgeBases',
            through: {
              attributes: ['priority', 'weight', 'max_chunks', 'min_similarity', 'is_active'],
            },
          },
          {
            model: PersonaPermission,
            as: 'permissions',
          },
        ],
      });

      if (!persona) {
        throw new NotFoundException(`Persona with ID ${id} not found`);
      }

      return persona;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to fetch persona', error);
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: UpdatePersonaDto,
    userId: string,
    organizationId: string,
  ): Promise<Persona> {
    try {
      const { knowledge_base_ids, ...personaData } = updateDto;
      const persona = await this.findOne(id, userId, organizationId);

      await persona.update(personaData);

      if (knowledge_base_ids) {
        await this.personaKnowledgeBaseModel.destroy({
          where: { persona_id: id },
        });

        if (knowledge_base_ids.length > 0) {
          await this.assignKnowledgeBases(id, knowledge_base_ids, userId, organizationId);
        }
      }

      this.logger.log(`Persona updated: ${id}`);

      return this.findOne(id, userId, organizationId);
    } catch (error) {
      this.logger.error('Failed to update persona', error);
      throw error;
    }
  }

  async remove(id: string, userId: string, organizationId: string): Promise<void> {
    try {
      const persona = await this.findOne(id, userId, organizationId);
      await persona.destroy();
      this.logger.log(`Persona deleted: ${id}`);
    } catch (error) {
      this.logger.error('Failed to delete persona', error);
      throw error;
    }
  }

  private async assignKnowledgeBases(
    personaId: string,
    knowledgeBaseIds: string[],
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const validKBs = await this.knowledgeBaseModel.findAll({
      where: {
        id: knowledgeBaseIds,
        organization_id: organizationId,
      },
    });

    if (validKBs.length !== knowledgeBaseIds.length) {
      throw new BadRequestException('One or more knowledge bases not found or not accessible');
    }

    const assignments = knowledgeBaseIds.map((kbId, index) => ({
      persona_id: personaId,
      knowledge_base_id: kbId,
      priority: index + 1,
      assigned_by: userId,
    }));

    await this.personaKnowledgeBaseModel.bulkCreate(assignments);
  }

  async assignKnowledgeBase(
    personaId: string,
    assignDto: AssignKnowledgeBaseDto,
    userId: string,
    organizationId: string,
  ): Promise<PersonaKnowledgeBase> {
    try {
      const persona = await this.findOne(personaId, userId, organizationId);

      const kb = await this.knowledgeBaseModel.findOne({
        where: {
          id: assignDto.knowledge_base_id,
          organization_id: organizationId,
        },
      });

      if (!kb) {
        throw new NotFoundException('Knowledge base not found');
      }

      const existing = await this.personaKnowledgeBaseModel.findOne({
        where: {
          persona_id: personaId,
          knowledge_base_id: assignDto.knowledge_base_id,
        },
      });

      if (existing) {
        throw new BadRequestException('Knowledge base already assigned to this persona');
      }

      const assignment = await this.personaKnowledgeBaseModel.create({
        persona_id: personaId,
        knowledge_base_id: assignDto.knowledge_base_id,
        priority: assignDto.priority || 1,
        assigned_by: userId,
      });

      this.logger.log(`Knowledge base ${assignDto.knowledge_base_id} assigned to persona ${personaId}`);

      return assignment;
    } catch (error) {
      this.logger.error('Failed to assign knowledge base', error);
      throw error;
    }
  }

  async removeKnowledgeBase(
    personaId: string,
    knowledgeBaseId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      await this.findOne(personaId, userId, organizationId);

      const deleted = await this.personaKnowledgeBaseModel.destroy({
        where: {
          persona_id: personaId,
          knowledge_base_id: knowledgeBaseId,
        },
      });

      if (deleted === 0) {
        throw new NotFoundException('Knowledge base assignment not found');
      }

      this.logger.log(`Knowledge base ${knowledgeBaseId} removed from persona ${personaId}`);
    } catch (error) {
      this.logger.error('Failed to remove knowledge base', error);
      throw error;
    }
  }

  async sharePersona(
    personaId: string,
    shareDto: SharePersonaDto,
    userId: string,
    organizationId: string,
  ): Promise<PersonaPermission[]> {
    try {
      const persona = await this.findOne(personaId, userId, organizationId);

      if (!shareDto.user_ids || shareDto.user_ids.length === 0) {
        throw new BadRequestException('At least one user ID is required');
      }

      const permissions = await Promise.all(
        shareDto.user_ids.map(async (targetUserId) => {
          const existing = await this.personaPermissionModel.findOne({
            where: {
              persona_id: personaId,
              user_id: targetUserId,
            },
          });

          if (existing) {
            await existing.update({
              access_level: shareDto.access_level,
              granted_by: userId,
            });
            return existing;
          }

          return this.personaPermissionModel.create({
            persona_id: personaId,
            user_id: targetUserId,
            access_level: shareDto.access_level,
            granted_by: userId,
            can_chat: true,
            can_view_config: shareDto.access_level === AccessLevel.CO_OWNER,
            can_edit_config: shareDto.access_level === AccessLevel.CO_OWNER,
            can_add_knowledge: [AccessLevel.CONTRIBUTOR, AccessLevel.CO_OWNER].includes(shareDto.access_level),
            can_share: shareDto.access_level === AccessLevel.CO_OWNER,
            can_delete: false,
          });
        }),
      );

      this.logger.log(`Persona ${personaId} shared with ${shareDto.user_ids.length} users`);

      return permissions;
    } catch (error) {
      this.logger.error('Failed to share persona', error);
      throw error;
    }
  }

  async generatePublicLink(
    personaId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ link: string; token: string }> {
    try {
      const persona = await this.findOne(personaId, userId, organizationId);

      const token = crypto.randomBytes(32).toString('hex');

      await persona.update({
        public_link_token: token,
        public_link_enabled: true,
        visibility: PersonaVisibility.PUBLIC,
      });

      this.logger.log(`Public link generated for persona ${personaId}`);

      return {
        link: `/personas/public/${token}`,
        token,
      };
    } catch (error) {
      this.logger.error('Failed to generate public link', error);
      throw error;
    }
  }

  async generateOrganizationLink(
    personaId: string,
    userId: string,
    organizationId: string,
  ): Promise<{ link: string; token: string }> {
    try {
      const persona = await this.findOne(personaId, userId, organizationId);

      const token = crypto.randomBytes(32).toString('hex');

      await persona.update({
        organization_link_token: token,
        organization_link_enabled: true,
        visibility: PersonaVisibility.ORGANIZATION,
      });

      this.logger.log(`Organization link generated for persona ${personaId}`);

      return {
        link: `/personas/org/${token}`,
        token,
      };
    } catch (error) {
      this.logger.error('Failed to generate organization link', error);
      throw error;
    }
  }

  async disablePublicLink(
    personaId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const persona = await this.findOne(personaId, userId, organizationId);

      await persona.update({
        public_link_enabled: false,
        public_link_token: null,
      });

      this.logger.log(`Public link disabled for persona ${personaId}`);
    } catch (error) {
      this.logger.error('Failed to disable public link', error);
      throw error;
    }
  }

  async disableOrganizationLink(
    personaId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const persona = await this.findOne(personaId, userId, organizationId);

      await persona.update({
        organization_link_enabled: false,
        organization_link_token: null,
      });

      this.logger.log(`Organization link disabled for persona ${personaId}`);
    } catch (error) {
      this.logger.error('Failed to disable organization link', error);
      throw error;
    }
  }

  async getPersonaByPublicLink(token: string): Promise<Persona> {
    try {
      const persona = await this.personaModel.findOne({
        where: {
          public_link_token: token,
          public_link_enabled: true,
        },
        include: [
          {
            model: KnowledgeBase,
            as: 'knowledgeBases',
          },
        ],
      });

      if (!persona) {
        throw new NotFoundException('Persona not found or link is disabled');
      }

      return persona;
    } catch (error) {
      this.logger.error('Failed to get persona by public link', error);
      throw error;
    }
  }

  async getPersonaByOrganizationLink(
    token: string,
    userId: string,
    organizationId: string,
  ): Promise<Persona> {
    try {
      const persona = await this.personaModel.findOne({
        where: {
          organization_link_token: token,
          organization_link_enabled: true,
          organization_id: organizationId,
        },
        include: [
          {
            model: KnowledgeBase,
            as: 'knowledgeBases',
          },
        ],
      });

      if (!persona) {
        throw new NotFoundException('Persona not found or link is disabled');
      }

      return persona;
    } catch (error) {
      this.logger.error('Failed to get persona by organization link', error);
      throw error;
    }
  }
}
