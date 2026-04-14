import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

describe('CheckoutService payment rules', () => {
  let service: CheckoutService;

  beforeEach(() => {
    service = new CheckoutService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('rejects cash payments for non-pickup shipping', () => {
    expect(() =>
      (service as any).validatePaymentMethod({
        paymentMethod: 'cash',
        shippingProvider: 'correo-argentino',
        shippingMethod: 'Correo Argentino - Domicilio',
      }),
    ).toThrow(BadRequestException);
  });

  it('allows cash payments for pickup orders', () => {
    expect(() =>
      (service as any).validatePaymentMethod({
        paymentMethod: 'cash',
        shippingProvider: 'store',
        shippingMethod: 'Retiro en local',
      }),
    ).not.toThrow();
  });

  it('rejects unsupported checkout payment methods', () => {
    expect(() =>
      (service as any).validatePaymentMethod({
        paymentMethod: 'crypto',
        shippingProvider: 'store',
        shippingMethod: 'Retiro en local',
      }),
    ).toThrow('Unsupported payment method');
  });
});
