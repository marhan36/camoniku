/**
 * Normalizes a string by stripping case, whitespace, and all punctuation/symbols.
 * Used for strict uniqueness check within a notebook:
 * e.g., "F & B" == "f&b" == "f b" == "fb"
 * "Makan & Minum" conflicts with "makan minum"
 */
export function normalizeString(input: string): string {
  if (!input) return ''
  // Unicode-aware regex stripping whitespace, punctuation, and symbols
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\p{P}\p{S}\p{Z}\s]+/gu, '')
}

/**
 * Checks if a candidate name is unique against an array of existing names
 */
export function isNameUnique(
  candidate: string,
  existingNames: string[],
  currentId?: string,
  itemsWithIds?: { id: string; name: string }[]
): boolean {
  const normalizedCandidate = normalizeString(candidate)
  if (!normalizedCandidate) return false

  if (itemsWithIds && currentId) {
    return !itemsWithIds.some(
      (item) => item.id !== currentId && normalizeString(item.name) === normalizedCandidate
    )
  }

  return !existingNames.some((name) => normalizeString(name) === normalizedCandidate)
}
