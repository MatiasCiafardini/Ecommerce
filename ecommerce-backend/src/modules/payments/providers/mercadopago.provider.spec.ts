import { MercadoPagoProvider } from './mercadopago.provider';

describe('MercadoPagoProvider', () => {
  it('defaults to hiding installments and never exposes the access token', async () => {
    const prisma = { store: { findUnique: jest.fn().mockResolvedValue({ mercadoPagoPublicKey: 'public', mercadoPagoAccessToken: 'secret', storefrontConfig: {} }) } };
    const provider = new MercadoPagoProvider(prisma as never);
    const config = await provider.getPublicConfig(1);
    expect(config.interestFreeInstallments.enabled).toBe(false);
    expect(JSON.stringify(config)).not.toContain('secret');
  });

  it('preserves the storefront when saving installments', async () => {
    const prisma = { store: { findUnique: jest.fn().mockResolvedValue({ mercadoPagoPublicKey: 'public', mercadoPagoAccessToken: 'secret', storefrontConfig: { theme: 'comovosyyo', pages: { home: [] } } }), update: jest.fn().mockResolvedValue({}) } };
    const provider = new MercadoPagoProvider(prisma as never);
    await provider.updateInstallmentsConfig(1, { enabled: true, count: 3, minimumAmount: 50000 });
    expect(prisma.store.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { storefrontConfig: { theme: 'comovosyyo', pages: { home: [] }, interestFreeInstallments: { enabled: true, count: 3, minimumAmount: 50000 } } } });
  });

  it('rejects unsupported plans and activation without credentials', async () => {
    const prisma = { store: { findUnique: jest.fn().mockResolvedValue({ storefrontConfig: {} }), update: jest.fn() } };
    const provider = new MercadoPagoProvider(prisma as never);
    await expect(provider.updateInstallmentsConfig(1, { enabled: true, count: 12, minimumAmount: 0 })).rejects.toThrow();
    await expect(provider.updateInstallmentsConfig(1, { enabled: true, count: 3, minimumAmount: 0 })).rejects.toThrow();
    expect(prisma.store.update).not.toHaveBeenCalled();
  });

  it('returns only masked admin credentials', async () => {
    const prisma = {
      store: {
        findUnique: jest.fn().mockResolvedValue({
          mercadoPagoPublicKey: 'pk_test_123',
          mercadoPagoAccessToken: 'APP_USR-1234567890',
          mercadoPagoWebhookSecret: 'whsec-abcdef123456',
        }),
      },
    };

    const provider = new MercadoPagoProvider(prisma as never);

    await expect(provider.getAdminConfig(7)).resolves.toEqual({
      publicKey: 'pk_test_123',
      accessTokenConfigured: true,
      webhookSecretConfigured: true,
      accessTokenPreview: 'APP_***7890',
      webhookSecretPreview: 'whse***3456',
    });
  });
});
