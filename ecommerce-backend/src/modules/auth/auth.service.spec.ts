import { AuthService } from './auth.service';

describe('AuthService', () => {
  const createService = (prismaOverrides: Record<string, any> = {}) => {
    const prisma = {
      store: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          manualSalesEnabled: false,
        }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn(),
      },
      ...prismaOverrides,
    };

    const jwtService = {
      sign: jest.fn().mockReturnValue('token'),
    };

    const service = new AuthService(prisma as any, jwtService as any);
    jest.spyOn(service as any, 'verifyGoogleCredential').mockResolvedValue({
      sub: 'google-user-id',
      email: 'MatiasCiafardini@gmail.com',
      email_verified: true,
      given_name: 'Matias',
      family_name: 'Ciafardini',
    });

    return { service, prisma };
  };

  it('returns an existing store user for a verified Google email before creating a customer', async () => {
    const existingUser = {
      id: 11,
      email: 'matiasciafardini@gmail.com',
      storeId: 7,
      role: 'ADMIN',
      password: 'hashed',
      name: 'Matias Ciafardini',
    };
    const { service, prisma } = createService({
      user: {
        findFirst: jest.fn().mockResolvedValue(existingUser),
      },
    });

    await expect(service.loginWithGoogle('credential', 7)).resolves.toBe(
      existingUser,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        storeId: 7,
        email: 'matiasciafardini@gmail.com',
      },
    });
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it('links an existing customer by email when no store user exists', async () => {
    const existingCustomer = {
      id: 12,
      email: 'matiasciafardini@gmail.com',
      storeId: 7,
      googleId: null,
      firstName: null,
      lastName: null,
    };
    const updatedCustomer = {
      ...existingCustomer,
      googleId: 'google-user-id',
      firstName: 'Matias',
      lastName: 'Ciafardini',
    };
    const { service, prisma } = createService({
      customer: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(existingCustomer),
        update: jest.fn().mockResolvedValue(updatedCustomer),
        create: jest.fn(),
      },
    });

    await expect(service.loginWithGoogle('credential', 7)).resolves.toEqual(
      updatedCustomer,
    );
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: existingCustomer.id },
      data: {
        googleId: 'google-user-id',
        firstName: 'Matias',
        lastName: 'Ciafardini',
      },
    });
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });
});
