import { normalizeDisplayText } from './display-text.util';

export function normalizeBrandDisplayName(value: string | null | undefined) {
  const normalized = normalizeDisplayText(value);
  if (!normalized) return '';

  // Short, single-word brand names are commonly acronyms (VCP, DC, etc.).
  // A deterministic spelling prevents VCP/Vcp from being persisted separately.
  return /^[\p{L}\p{N}]{2,4}$/u.test(normalized)
    ? normalized.toLocaleUpperCase('es-AR')
    : normalized;
}

export function normalizeBrandKey(value: string | null | undefined) {
  return (value?.trim().replace(/\s+/g, ' ') || 'Sin marca')
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function chooseBrandDisplayName(current: string | undefined, candidate: string) {
  const normalizedCandidate = candidate.trim().replace(/\s+/g, ' ') || 'Sin marca';
  if (!current) return normalizedCandidate;

  // Preserve explicitly written acronyms (VCP, DC, etc.) as the display spelling.
  const isUppercaseAcronym = (value: string) =>
    value.length <= 5 && /[A-Z]/.test(value) && value === value.toLocaleUpperCase('es-AR');

  return isUppercaseAcronym(normalizedCandidate) && !isUppercaseAcronym(current)
    ? normalizedCandidate
    : current;
}

export function uniqueBrandDisplayNames(values: string[]) {
  const names = new Map<string, string>();
  for (const value of values) {
    const key = normalizeBrandKey(value);
    names.set(key, chooseBrandDisplayName(names.get(key), value));
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'es-AR'));
}
