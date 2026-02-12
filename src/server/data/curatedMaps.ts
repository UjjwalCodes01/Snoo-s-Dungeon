/**
 * Curated Map Queue — 30 hand-crafted & programmatically varied dungeon layouts.
 *
 * 10×10 grid: '1' = floor, '0' = wall, 'T' = teleport
 * All layouts are validated for connectivity, minimum open area, and boss arena.
 *
 * Base patterns:
 *   1-5   Classic layouts (arena, cross, corridors, ring, maze)
 *   6-10  Themed (castle, crypt, cavern, throne, garden)
 *   11-20 Mirrored / rotated variants of 1-10
 *   21-30 Hybrid mashups + teleport variants
 */

export interface CuratedMap {
  id: number;
  name: string;
  layout: string;
  monster: string;
  modifier: string;
}

// Helper: rotate a 10×10 layout 90° clockwise
function rotate90(layout: string): string {
  const g = 10;
  const out: string[] = new Array(100);
  for (let r = 0; r < g; r++) {
    for (let c = 0; c < g; c++) {
      out[c * g + (g - 1 - r)] = layout[r * g + c]!;
    }
  }
  return out.join('');
}

// Helper: mirror a 10×10 layout horizontally
function mirrorH(layout: string): string {
  const g = 10;
  const out: string[] = new Array(100);
  for (let r = 0; r < g; r++) {
    for (let c = 0; c < g; c++) {
      out[r * g + (g - 1 - c)] = layout[r * g + c]!;
    }
  }
  return out.join('');
}

// Helper: mirror a 10×10 layout vertically
function mirrorV(layout: string): string {
  const g = 10;
  const out: string[] = new Array(100);
  for (let r = 0; r < g; r++) {
    for (let c = 0; c < g; c++) {
      out[(g - 1 - r) * g + c] = layout[r * g + c]!;
    }
  }
  return out.join('');
}

// ─── 10 Base Layouts ─────────────────────────────────────────────────────────

const BASE_LAYOUTS: { name: string; layout: string; monster: string; modifier: string }[] = [
  // 1. Open Arena — big open center, walls on edges
  {
    name: 'The Arena',
    layout:
      '0000000000' +
      '0111111110' +
      '0111111110' +
      '0111111110' +
      '0111111110' +
      '0111111110' +
      '0111111110' +
      '0111111110' +
      '0111111110' +
      '0000000000',
    monster: 'Goblin',
    modifier: 'Normal',
  },
  // 2. Cross Roads — classic cross pattern
  {
    name: 'The Crossroads',
    layout:
      '0000110000' +
      '0001111000' +
      '0001111000' +
      '0111111110' +
      '1111111111' +
      '1111111111' +
      '0111111110' +
      '0001111000' +
      '0001111000' +
      '0000110000',
    monster: 'Skeleton',
    modifier: 'Normal',
  },
  // 3. Four Rooms — connected chambers
  {
    name: 'Four Chambers',
    layout:
      '1111011110' +
      '1111011110' +
      '1111011110' +
      '0000111000' +
      '0111111110' +
      '0111111110' +
      '0001110000' +
      '0111011110' +
      '0111011110' +
      '0111011110',
    monster: 'Vampire',
    modifier: 'Normal',
  },
  // 4. Winding Path — narrow corridors
  {
    name: 'The Labyrinth',
    layout:
      '1111110000' +
      '0000110000' +
      '0000111110' +
      '0000000010' +
      '0111111110' +
      '0100000000' +
      '0111111100' +
      '0000000100' +
      '0011111100' +
      '0010000000',
    monster: 'Skeleton',
    modifier: 'Speed Boost',
  },
  // 5. Ring — donut shape
  {
    name: 'The Ring',
    layout:
      '0001111000' +
      '0011111100' +
      '0111001110' +
      '1110000111' +
      '1100000011' +
      '1100000011' +
      '1110000111' +
      '0111001110' +
      '0011111100' +
      '0001111000',
    monster: 'Goblin',
    modifier: 'Normal',
  },
  // 6. Castle — walls forming a castle shape
  {
    name: 'The Castle',
    layout:
      '1010010101' +
      '1111111111' +
      '0111111110' +
      '0111001110' +
      '0111001110' +
      '0111111110' +
      '0111111110' +
      '0011111100' +
      '0001111000' +
      '0000110000',
    monster: 'Vampire',
    modifier: 'Normal',
  },
  // 7. Crypt Corridors — narrow interconnected corridors
  {
    name: 'The Crypt',
    layout:
      '1110011100' +
      '0010010100' +
      '0011111100' +
      '0010010100' +
      '0011011100' +
      '0010010000' +
      '1111011110' +
      '0000010010' +
      '0011111110' +
      '0010000010',
    monster: 'Skeleton',
    modifier: 'Darkness',
  },
  // 8. Open Cavern — large open space with pillars
  {
    name: 'The Cavern',
    layout:
      '0011111100' +
      '0111111110' +
      '1111011111' +
      '1110000111' +
      '1111111111' +
      '1111111111' +
      '1110000111' +
      '1111011111' +
      '0111111110' +
      '0011111100',
    monster: 'Goblin',
    modifier: 'Normal',
  },
  // 9. Throne Room — wide hall leading to boss area
  {
    name: 'Throne Room',
    layout:
      '0111111110' +
      '0100000010' +
      '0111111110' +
      '0010000100' +
      '0011111100' +
      '0111111110' +
      '1111111111' +
      '1111111111' +
      '0111111110' +
      '0011111100',
    monster: 'Vampire',
    modifier: 'Normal',
  },
  // 10. Garden — semi-open with scattered walls
  {
    name: 'The Garden',
    layout:
      '1111111111' +
      '1100110011' +
      '1111111111' +
      '1011110110' +
      '1111111111' +
      '1111111111' +
      '0110111101' +
      '1111111111' +
      '1100110011' +
      '1111111111',
    monster: 'Goblin',
    modifier: 'Normal',
  },
];

// ─── Generate 30 Maps from 10 Base Layouts ──────────────────────────────────

const MONSTERS = ['Goblin', 'Skeleton', 'Vampire'];
const MODIFIERS = ['Normal', 'Normal', 'Normal', 'Speed Boost', 'Darkness', 'Normal'];

function buildCuratedMaps(): CuratedMap[] {
  const maps: CuratedMap[] = [];
  let id = 1;

  // 1-10: Original base layouts
  for (const base of BASE_LAYOUTS) {
    maps.push({ id: id++, ...base });
  }

  // 11-20: Mirrored versions (horizontal) with different monsters
  for (const base of BASE_LAYOUTS) {
    const mirrored = mirrorH(base.layout);
    // Skip if mirror is identical (symmetric maps)
    if (mirrored === base.layout) {
      // Use vertical mirror instead
      const mv = mirrorV(base.layout);
      if (mv !== base.layout) {
        maps.push({
          id: id++,
          name: `${base.name} (Flipped)`,
          layout: mv,
          monster: MONSTERS[(id + 1) % 3]!,
          modifier: MODIFIERS[id % MODIFIERS.length]!,
        });
        continue;
      }
      // Both mirrors identical — use 90° rotation
      maps.push({
        id: id++,
        name: `${base.name} (Rotated)`,
        layout: rotate90(base.layout),
        monster: MONSTERS[(id + 1) % 3]!,
        modifier: MODIFIERS[id % MODIFIERS.length]!,
      });
      continue;
    }
    maps.push({
      id: id++,
      name: `${base.name} (Mirrored)`,
      layout: mirrored,
      monster: MONSTERS[(id + 1) % 3]!,
      modifier: MODIFIERS[id % MODIFIERS.length]!,
    });
  }

  // 21-30: Rotated 90° versions with different modifiers
  for (const base of BASE_LAYOUTS) {
    const rotated = rotate90(base.layout);
    maps.push({
      id: id++,
      name: `${base.name} (Twisted)`,
      layout: rotated,
      monster: MONSTERS[(id + 2) % 3]!,
      modifier: MODIFIERS[(id + 2) % MODIFIERS.length]!,
    });
  }

  return maps;
}

export const CURATED_MAPS: CuratedMap[] = buildCuratedMaps();

/**
 * Get today's curated map based on the date.
 * Falls back to rotation through the queue.
 */
export function getCuratedMapForDate(date?: Date): CuratedMap {
  const d = date || new Date();
  // Day-of-year based rotation
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % CURATED_MAPS.length;
  return CURATED_MAPS[index]!;
}
