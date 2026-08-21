const normalizeGiftCardText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function isGiftCardProduct(title: string, skus: string | string[] = '') {
  const values = [title, ...(Array.isArray(skus) ? skus : [skus])]
    .map(normalizeGiftCardText)
    .filter(Boolean);

  return values.some((value) =>
    /(^|\s)GIFT\s*CARD(\s|$)/.test(value)
      || /(^|\s)TARJETA\s+(DE\s+)?REGALO(\s|$)/.test(value)
      || /^GIF\s+CAR(\s|$)/.test(value),
  );
}

