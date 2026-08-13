import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PersonaService } from './persona.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import {
  SharePersonaDto,
  GenerateLinkDto,
  AssignKnowledgeBaseDto,
} from './dto/share-persona.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('personas')
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  /**
   * Create a new persona
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPersonaDto: CreatePersonaDto,
    @CurrentUser() user: any,
  ) {
    const persona = await this.personaService.create(
      createPersonaDto,
      user.userId,
      user.organizationId,
    );

    return {
      success: true,
      message: 'Persona created successfully',
      data: persona,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: any) {
    const personas = await this.personaService.findAll(
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Personas retrieved successfully',
      data: personas,
      count: personas.length,
    };
  }

  /**
   * Generate four personalized starter prompts for a new conversation.
   */
  @Get(':id/recommended-prompts')
  @UseGuards(JwtAuthGuard)
  async getRecommendedPrompts(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const prompts = await this.personaService.getRecommendedPrompts(
      id,
      user.userId,
      user.organizationId,
    );

    return {
      success: true,
      message: 'Recommended prompts generated successfully',
      data: prompts,
      count: prompts.length,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const persona = await this.personaService.findOne(
      id,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Persona retrieved successfully',
      data: persona,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updatePersonaDto: UpdatePersonaDto,
    @CurrentUser() user: any,
  ) {
    const persona = await this.personaService.update(
      id,
      updatePersonaDto,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Persona updated successfully',
      data: persona,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.personaService.remove(id, user.userId, user.organizationId);
    return {
      success: true,
      message: 'Persona deleted successfully',
    };
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sharePersona(
    @Param('id') id: string,
    @Body() shareDto: SharePersonaDto,
    @CurrentUser() user: any,
  ) {
    const permissions = await this.personaService.sharePersona(
      id,
      shareDto,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: `Persona shared with ${permissions.length} user(s)`,
      data: permissions,
    };
  }

  @Post(':id/generate-link/public')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generatePublicLink(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.personaService.generatePublicLink(
      id,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Public link generated successfully',
      data: result,
    };
  }

  @Post(':id/generate-link/organization')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateOrganizationLink(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.personaService.generateOrganizationLink(
      id,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Organization link generated successfully',
      data: result,
    };
  }

  @Delete(':id/link/public')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disablePublicLink(@Param('id') id: string, @CurrentUser() user: any) {
    await this.personaService.disablePublicLink(
      id,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Public link disabled successfully',
    };
  }

  @Delete(':id/link/organization')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disableOrganizationLink(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.personaService.disableOrganizationLink(
      id,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Organization link disabled successfully',
    };
  }

  @Get('public/:token')
  @Public()
  async getByPublicLink(@Param('token') token: string) {
    const persona = await this.personaService.getPersonaByPublicLink(token);
    return {
      success: true,
      message: 'Persona retrieved successfully',
      data: persona,
    };
  }

  @Get('org/:token')
  @UseGuards(JwtAuthGuard)
  async getByOrganizationLink(
    @Param('token') token: string,
    @CurrentUser() user: any,
  ) {
    const persona = await this.personaService.getPersonaByOrganizationLink(
      token,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Persona retrieved successfully',
      data: persona,
    };
  }

  @Post(':id/knowledge-bases')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async assignKnowledgeBase(
    @Param('id') id: string,
    @Body() assignDto: AssignKnowledgeBaseDto,
    @CurrentUser() user: any,
  ) {
    const assignment = await this.personaService.assignKnowledgeBase(
      id,
      assignDto,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Knowledge base assigned successfully',
      data: assignment,
    };
  }

  @Delete(':id/knowledge-bases/:kbId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeKnowledgeBase(
    @Param('id') id: string,
    @Param('kbId') kbId: string,
    @CurrentUser() user: any,
  ) {
    await this.personaService.removeKnowledgeBase(
      id,
      kbId,
      user.userId,
      user.organizationId,
    );
    return {
      success: true,
      message: 'Knowledge base removed successfully',
    };
  }
}
