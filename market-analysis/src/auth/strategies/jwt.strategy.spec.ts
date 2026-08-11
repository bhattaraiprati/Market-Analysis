import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UserStatus } from '../../common/enums';

describe('JwtStrategy organization resolution', () => {
  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'owner@example.com',
    name: 'Owner',
    role: 'user',
    organizationId: null,
  };

  it('loads a newly created organization when the JWT claim is stale', async () => {
    const userModel = {
      findByPk: jest.fn().mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
        is_verified: true,
      }),
    };
    const organizationModel = {
      findOne: jest.fn().mockResolvedValue({ id: 'organization-1' }),
    };
    const organizationMemberModel = { findOne: jest.fn() };
    const configService = {
      get: jest.fn((_key: string, fallback: string) => fallback),
    };

    const strategy = new JwtStrategy(
      configService as any,
      userModel as any,
      organizationModel as any,
      organizationMemberModel as any,
    );

    await expect(strategy.validate(payload)).resolves.toEqual(
      expect.objectContaining({ organizationId: 'organization-1' }),
    );
    expect(organizationModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { owner_id: 'user-1' } }),
    );
  });
});
