// Strips combining diacritical marks (accents) so search matching works
// regardless of whether the query or the stored value has them — e.g.
// "Maricic" matches "Maričić", "Botosani" matches "Botoşani".
export function stripDiacritics(value) {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
