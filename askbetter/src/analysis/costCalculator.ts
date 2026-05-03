export function calculateCost(
  tokens: number,
  pricePerMillion: number,
): number {
  if (tokens <= 0 || pricePerMillion <= 0) {
    return 0;
  }
  return (tokens / 1_000_000) * pricePerMillion;
}
