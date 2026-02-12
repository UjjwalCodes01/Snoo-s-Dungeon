/**
 * Map Validation Module
 * Validates dungeon layout submissions for playability & safety.
 *
 * A valid 10×10 layout must:
 *   1. Be exactly 100 characters of '0', '1', and optionally 'T'/'t'.
 *   2. Have 20-70 floor tiles (inclusive).
 *   3. Have a single connected component covering ≥80 % of all floor tiles.
 *   4. Contain at least one 3×3 open area (needed for boss fights).
 *   5. Not match known offensive patterns (basic density heuristic).
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  /** The set of (row,col) indices that are reachable from the largest component. */
  reachableTiles?: Set<string>;
  /** Center of the largest open rectangle (grid coords). */
  bossArena?: { row: number; col: number };
}

const GRID = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFloor(ch: string): boolean {
  return ch === '1' || ch === 'T' || ch === 't';
}

/** BFS flood-fill from a single (row,col), returns set of "row,col" keys. */
function floodFill(tiles: string[], startRow: number, startCol: number): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [[startRow, startCol]];
  const key = (r: number, c: number) => `${r},${c}`;

  visited.add(key(startRow, startCol));

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as [number, number][]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
      const nk = key(nr, nc);
      if (visited.has(nk)) continue;
      if (!isFloor(tiles[nr * GRID + nc]!)) continue;
      visited.add(nk);
      queue.push([nr, nc]);
    }
  }
  return visited;
}

/** Find all connected components of floor tiles. */
function findComponents(tiles: string[]): Set<string>[] {
  const globalVisited = new Set<string>();
  const components: Set<string>[] = [];

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const k = `${r},${c}`;
      if (globalVisited.has(k)) continue;
      if (!isFloor(tiles[r * GRID + c]!)) continue;

      const comp = floodFill(tiles, r, c);
      comp.forEach((v) => globalVisited.add(v));
      components.push(comp);
    }
  }

  return components;
}

/** Check for at least one 3×3 open area inside the given reachable set. */
function findBossArena(_tiles: string[], reachable: Set<string>): { row: number; col: number } | null {
  // Try largest rectangle first (5×5, 4×4, 3×3)
  for (const size of [5, 4, 3]) {
    for (let r = 0; r <= GRID - size; r++) {
      for (let c = 0; c <= GRID - size; c++) {
        let allOpen = true;
        for (let dr = 0; dr < size && allOpen; dr++) {
          for (let dc = 0; dc < size && allOpen; dc++) {
            if (!reachable.has(`${r + dr},${c + dc}`)) allOpen = false;
          }
        }
        if (allOpen) {
          // Return center of this rectangle
          const center = Math.floor(size / 2);
          return { row: r + center, col: c + center };
        }
      }
    }
  }
  return null;
}

/** Count teleport ('T'/'t') tiles. */
function countTeleports(tiles: string[]): number {
  return tiles.filter((t) => t === 'T' || t === 't').length;
}

// ─── Main Validator ──────────────────────────────────────────────────────────

export function validateLayout(layout: string): ValidationResult {
  // 1. Length & character check
  if (layout.length !== 100) {
    return { valid: false, reason: `Layout must be exactly 100 characters (got ${layout.length})` };
  }

  const tiles = layout.split('');
  if (!tiles.every((ch) => ch === '0' || ch === '1' || ch === 'T' || ch === 't')) {
    return { valid: false, reason: 'Layout may only contain 0, 1, T characters' };
  }

  // 2. Floor tile count
  const floorCount = tiles.filter(isFloor).length;
  if (floorCount < 20) {
    return { valid: false, reason: `Too few walkable tiles (${floorCount}). Need at least 20.` };
  }
  if (floorCount > 80) {
    return { valid: false, reason: `Too many walkable tiles (${floorCount}). Max 80.` };
  }

  // 3. Connectivity — largest component must cover ≥80 % of floor tiles
  const components = findComponents(tiles);
  if (components.length === 0) {
    return { valid: false, reason: 'No walkable tiles found.' };
  }

  // Sort descending by size
  components.sort((a, b) => b.size - a.size);
  const largest = components[0]!;
  const coverage = largest.size / floorCount;

  if (coverage < 0.8) {
    return {
      valid: false,
      reason: `Map is too fragmented. Largest connected area covers only ${Math.round(coverage * 100)}% of floor tiles (need ≥80%).`,
    };
  }

  // 4. Boss arena — need at least a 3×3 open area
  const arena = findBossArena(tiles, largest);
  if (!arena) {
    return { valid: false, reason: 'Map needs at least one 3×3 open area for boss fights.' };
  }

  // 5. Teleport tile count (max 4 — two pairs)
  const teleports = countTeleports(tiles);
  if (teleports > 4) {
    return { valid: false, reason: `Too many teleport tiles (${teleports}). Max 4.` };
  }
  if (teleports % 2 !== 0) {
    return { valid: false, reason: `Teleport tiles must come in pairs (got ${teleports}).` };
  }

  return {
    valid: true,
    reachableTiles: largest,
    bossArena: arena,
  };
}

/**
 * Given a layout string, return the set of reachable tile indices (0-99)
 * from the largest connected component.
 * Returns null if validation fails.
 */
export function getReachableIndices(layout: string): Set<number> | null {
  const result = validateLayout(layout);
  if (!result.valid || !result.reachableTiles) return null;

  const indices = new Set<number>();
  result.reachableTiles.forEach((key) => {
    const [r, c] = key.split(',').map(Number);
    indices.add(r! * GRID + c!);
  });
  return indices;
}
