export interface NotionColor {
  id: string;
  label: string;
  bg: string;
  fg: string;
}

export const NOTION_COLORS: NotionColor[] = [
  { id: 'default', label: 'Default', bg: '#E7E5E4', fg: '#37352F' },
  { id: 'gray', label: 'Gray', bg: '#E3E2E0', fg: '#787774' },
  { id: 'brown', label: 'Brown', bg: '#EEE0DA', fg: '#64473A' },
  { id: 'orange', label: 'Orange', bg: '#FADEC9', fg: '#D9730D' },
  { id: 'yellow', label: 'Yellow', bg: '#FDECC8', fg: '#DFAB01' },
  { id: 'green', label: 'Green', bg: '#DBEDDB', fg: '#0F7B0F' },
  { id: 'blue', label: 'Blue', bg: '#D3E5EF', fg: '#0B6E99' },
  { id: 'purple', label: 'Purple', bg: '#E8DEEE', fg: '#6940A5' },
  { id: 'pink', label: 'Pink', bg: '#F5E0E9', fg: '#AD1A72' },
  { id: 'red', label: 'Red', bg: '#FFE2DD', fg: '#E03E3E' },
];

export function findColor(hexOrId: string | undefined): NotionColor {
  if (!hexOrId) return NOTION_COLORS[0];
  const byId = NOTION_COLORS.find((c) => c.id === hexOrId);
  if (byId) return byId;
  const byBg = NOTION_COLORS.find(
    (c) => c.bg.toLowerCase() === hexOrId.toLowerCase()
  );
  return byBg || NOTION_COLORS[0];
}

export function nextColor(currentHex?: string): NotionColor {
  const idx = NOTION_COLORS.findIndex((c) => c.bg.toLowerCase() === (currentHex || '').toLowerCase());
  return NOTION_COLORS[(idx + 1) % NOTION_COLORS.length];
}
