/** Appends operator notes to an existing record without overwriting prior text. */
export function mergeComments(existing: string, additional: string): string {
  const add = additional.trim();
  if (!add) return existing.trim();
  const base = existing.trim();
  if (!base) return add;
  return `${base}\n\n---\n${add}`;
}
