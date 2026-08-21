import { isGiftCardProduct } from './gift-card-product';

describe('isGiftCardProduct', () => {
  it.each([
    ['GIFT CARD TROJANI', ''],
    ['Gift-card virtual', ''],
    ['Tarjeta de regalo', ''],
    ['Producto digital', 'GIF-CAR-100'],
  ])('identifies gift cards from title or SKU', (title, sku) => {
    expect(isGiftCardProduct(title, sku)).toBe(true);
  });

  it('does not exclude ordinary products containing unrelated words', () => {
    expect(isGiftCardProduct('Cartera Gift', 'CAR-100')).toBe(false);
  });
});

