const SIZE_TOKENS = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']);

export function normalizeDisplayText(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  if (!normalized) return '';

  return normalized
    .split(' ')
    .map((word) => normalizeDisplayWord(word))
    .join(' ');
}

function normalizeDisplayWord(word: string) {
  const lower = word.toLocaleLowerCase('es-AR');
  if (SIZE_TOKENS.has(lower)) {
    return lower.toLocaleUpperCase('es-AR');
  }

  return lower.replace(/(^|[-/'])([a-záéíóúñü])/giu, (match, separator: string, letter: string) =>
    `${separator}${letter.toLocaleUpperCase('es-AR')}`,
  );
}
