export const roundCurrency = (value: unknown) => {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};
