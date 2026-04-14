import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: {
    cart: {
      findFirst: jest.Mock;
    };
  };
  let providersRegistry: {
    getProvider: jest.Mock;
  };
  let quotesService: {
    persistQuotes: jest.Mock;
  };
  let providerConfigService: {
    resolveProviderForStore: jest.Mock;
  };
  let packageCalculator: {
    calculateFromItems: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findFirst: jest.fn(),
      },
    };

    providersRegistry = {
      getProvider: jest.fn(),
    };

    quotesService = {
      persistQuotes: jest.fn(),
    };

    providerConfigService = {
      resolveProviderForStore: jest.fn(),
    };
    packageCalculator = {
      calculateFromItems: jest.fn(),
    };

    service = new ShippingService(
      prisma as never,
      providersRegistry as never,
      quotesService as never,
      providerConfigService as never,
      packageCalculator as never,
    );
  });

  it('merges external carrier rates with pickup options for checkout', async () => {
    prisma.cart.findFirst.mockResolvedValue({
      id: 9,
      storeId: 3,
      customerId: 18,
      items: [
        {
          quantity: 2,
          variant: {
            weight: 0.6,
            price: 10000,
          },
        },
      ],
    });

    const externalProvider = {
      providerCode: 'correo-argentino',
      getRates: jest.fn().mockResolvedValue([
        {
          provider: 'correo-argentino',
          method: 'Correo Argentino - Domicilio',
          price: 5200,
          estimatedDays: 3,
          carrierId: 'correo-argentino',
          carrierName: 'Correo Argentino',
          serviceCode: 'CP',
          modalityCode: 'D',
          dispatchType: 'D',
        },
        {
          provider: 'correo-argentino',
          method: 'Correo Argentino - Sucursal',
          price: 4500,
          estimatedDays: 3,
          carrierId: 'correo-argentino',
          carrierName: 'Correo Argentino',
          serviceCode: 'CP',
          modalityCode: 'S',
          dispatchType: 'S',
          metadata: {
            requiresBranchSelection: true,
          },
        },
      ]),
    };
    const manualProvider = {
      providerCode: 'manual',
      getRates: jest.fn().mockResolvedValue([
        {
          provider: 'manual',
          method: 'Retiro en local',
          price: 0,
          estimatedDays: 0,
          carrierId: 'store',
          carrierName: 'Retiro en local',
          serviceCode: 'pickup',
          modalityCode: 'pickup',
          dispatchType: 'pickup',
        },
      ]),
    };

    providerConfigService.resolveProviderForStore.mockResolvedValue({
      provider: externalProvider,
      config: {
        id: 'cfg-correo',
      },
      context: {
        storeId: 3,
        config: {
          id: 'cfg-correo',
          provider: 'correo-argentino',
          source: 'store',
        },
      },
    });
    packageCalculator.calculateFromItems.mockReturnValue({
      weightGrams: 1200,
      weightKg: 1.2,
      package: {
        height: 8,
        width: 30,
        length: 40,
      },
      summary: {
        weightGrams: 1200,
        weightKg: 1.2,
        heightCm: 8,
        widthCm: 30,
        lengthCm: 40,
      },
    });
    providersRegistry.getProvider.mockReturnValue(manualProvider);
    quotesService.persistQuotes.mockImplementation((params) => params.rates);

    const result = await service.getOptions(3, 9, 18, '1704', {
      state: 'Buenos Aires',
      city: 'Ramos Mejia',
      country: 'AR',
    });

    expect(externalProvider.getRates).toHaveBeenCalledWith(
      expect.objectContaining({
        weight: 1.2,
        package: expect.objectContaining({
          weightGrams: 1200,
          height: 8,
          width: 30,
          length: 40,
        }),
      }),
      expect.anything(),
    );
    expect(manualProvider.getRates).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'correo-argentino',
          method: 'Correo Argentino - Domicilio',
          providerConfigId: 'cfg-correo',
        }),
        expect.objectContaining({
          provider: 'manual',
          method: 'Retiro en local',
        }),
      ]),
    );
  });

  it('does not silently fall back to manual rates when the external carrier fails', async () => {
    prisma.cart.findFirst.mockResolvedValue({
      id: 9,
      storeId: 3,
      customerId: 18,
      items: [
        {
          quantity: 1,
          variant: {
            weight: 1,
            price: 10000,
          },
        },
      ],
    });

    providerConfigService.resolveProviderForStore.mockResolvedValue({
      provider: {
        providerCode: 'correo-argentino',
        getRates: jest
          .fn()
          .mockRejectedValue(new Error('Correo Argentino unavailable')),
      },
      config: {
        id: 'cfg-correo',
      },
      context: {
        storeId: 3,
        config: {
          id: 'cfg-correo',
          provider: 'correo-argentino',
          source: 'store',
        },
      },
    });
    packageCalculator.calculateFromItems.mockReturnValue({
      weightGrams: 1000,
      weightKg: 1,
      package: {
        height: 6,
        width: 22,
        length: 30,
      },
      summary: {
        weightGrams: 1000,
        weightKg: 1,
        heightCm: 6,
        widthCm: 22,
        lengthCm: 30,
      },
    });
    providersRegistry.getProvider.mockReturnValue({
      providerCode: 'manual',
      getRates: jest.fn().mockResolvedValue([]),
    });

    await expect(
      service.getOptions(3, 9, 18, '1704', {
        state: 'Buenos Aires',
        city: 'Ramos Mejia',
        country: 'AR',
      }),
    ).rejects.toThrow('Correo Argentino unavailable');
  });
});
