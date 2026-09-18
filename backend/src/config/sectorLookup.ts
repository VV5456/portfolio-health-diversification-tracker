import sectorMappingData from './sector-mapping.json';

const sectorMapping: Record<string, string> = sectorMappingData;

export function getSectorForSymbol(symbol: string): string {
  if (!symbol) return 'Other';
  const normalizedSymbol = symbol.trim().toUpperCase();
  return sectorMapping[normalizedSymbol] || 'Other';
}
