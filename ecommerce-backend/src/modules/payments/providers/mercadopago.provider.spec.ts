import { MercadoPagoProvider } from './mercadopago.provider';

describe('MercadoPagoProvider', () => {
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
