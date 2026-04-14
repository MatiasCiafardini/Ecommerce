import { ShippingPackageCalculatorService } from './shipping-package-calculator.service';

describe('ShippingPackageCalculatorService', () => {
  let service: ShippingPackageCalculatorService;

  beforeEach(() => {
    service = new ShippingPackageCalculatorService();
  });

  it('calculates a single shirt package from variant logistics', () => {
    const result = service.calculateFromItems([
      {
        quantity: 1,
        variant: {
          sku: 'REM-001',
          weightGrams: 250,
          packageHeightCm: 2,
          packageWidthCm: 28,
          packageLengthCm: 35,
        },
      },
    ]);

    expect(result.summary).toMatchObject({
      weightGrams: 250,
      widthCm: 31,
      lengthCm: 38,
      heightCm: 3,
    });
  });

  it('stacks two shirts by quantity', () => {
    const result = service.calculateFromItems([
      {
        quantity: 2,
        variant: {
          sku: 'REM-002',
          weightGrams: 250,
          packageHeightCm: 2,
          packageWidthCm: 28,
          packageLengthCm: 35,
        },
      },
    ]);

    expect(result.summary).toMatchObject({
      weightGrams: 500,
      widthCm: 31,
      lengthCm: 38,
      heightCm: 5,
    });
  });

  it('combines hoodie and shirt using max width/length and stacked height', () => {
    const result = service.calculateFromItems([
      {
        quantity: 1,
        variant: {
          sku: 'BUZO-001',
          weightGrams: 600,
          packageHeightCm: 6,
          packageWidthCm: 34,
          packageLengthCm: 38,
        },
      },
      {
        quantity: 1,
        variant: {
          sku: 'REM-003',
          weightGrams: 250,
          packageHeightCm: 2,
          packageWidthCm: 28,
          packageLengthCm: 35,
        },
      },
    ]);

    expect(result.summary).toMatchObject({
      weightGrams: 850,
      widthCm: 37,
      lengthCm: 42,
      heightCm: 9,
    });
  });

  it('falls back to store dimensions when a product has no dimensions', () => {
    const result = service.calculateFromItems(
      [
        {
          quantity: 1,
          variant: {
            sku: 'ACC-001',
            weightGrams: 180,
            product: {
              title: 'Accesorio',
            },
          },
        },
      ],
      {
        provider: 'correo-argentino',
        source: 'store',
        metadata: {
          defaultPackageDimensions: {
            height: 4,
            width: 16,
            length: 22,
          },
        },
      },
    );

    expect(result.usedStoreFallbackForDimensions).toBe(true);
    expect(result.summary).toMatchObject({
      weightGrams: 180,
      heightCm: 5,
      widthCm: 18,
      lengthCm: 24,
    });
  });

  it('fails clearly when shipping weight is missing', () => {
    expect(() =>
      service.calculateFromItems([
        {
          quantity: 1,
          variant: {
            sku: 'SIN-PESO',
            packageHeightCm: 3,
            packageWidthCm: 20,
            packageLengthCm: 25,
          },
        },
      ]),
    ).toThrow('requires weight');
  });
});
