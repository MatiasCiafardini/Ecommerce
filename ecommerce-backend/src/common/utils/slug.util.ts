export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // quita caracteres raros
    .replace(/\s+/g, '-') // espacios -> -
    .replace(/-+/g, '-'); // evita -- duplicados
}
