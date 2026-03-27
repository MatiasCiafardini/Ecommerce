export const roundCurrency = (value: number | string | null | undefined) => {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

export const formatCurrency = (value: number | string | null | undefined) =>
  `$${roundCurrency(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
