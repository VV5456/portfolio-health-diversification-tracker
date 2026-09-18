import sectorMappingData from './sector-mapping.json';

const sectorMapping: Record<string, string> = sectorMappingData;

// Create a lookup map from lowercase sector name to canonical sector name
const canonicalSectorMap: Record<string, string> = {};

Object.values(sectorMapping).forEach((sector) => {
  canonicalSectorMap[sector.toLowerCase()] = sector;
});

// Also add common non-stock target categories if applicable
canonicalSectorMap['cash'] = 'Cash';
canonicalSectorMap['total_equity'] = 'TOTAL_EQUITY';

export function getSectorForSymbol(symbol: string): string {
  if (!symbol) return 'Other';
  const normalizedSymbol = symbol.trim().toUpperCase();
  return sectorMapping[normalizedSymbol] || 'Other';
}

export function normalizeCategory(category: string): string {
  if (!category) return '';
  const trimmed = category.trim();
  const lower = trimmed.toLowerCase();
  
  if (canonicalSectorMap[lower]) {
    return canonicalSectorMap[lower];
  }
  
  return trimmed;
}
