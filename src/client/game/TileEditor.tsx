import { useState } from 'react';

const GRID_SIZE = 10;

// Flood fill algorithm to check if all floor tiles are connected
function isMapValid(grid: number[][]): { valid: boolean; message: string } {
  const floors: [number, number][] = [];
  
  // Find all floor tiles (0 = wall, 1 = floor in the display, but we store 0 as floor, 1 as wall)
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i]?.[j] === 0) {
        floors.push([i, j]);
      }
    }
  }
  
  if (floors.length === 0) {
    return { valid: false, message: '❌ Map must have at least some floor tiles!' };
  }
  
  if (floors.length < 20) {
    return { valid: false, message: '❌ Map needs at least 20 floor tiles for combat & playability!' };
  }
  
  if (floors.length > 95) {
    return { valid: false, message: '❌ Map needs some walls! Maximum 95 floor tiles.' };
  }
  
  // Check for open areas - ensure there are some 2x2 or larger open spaces
  let openAreas = 0;
  for (let i = 0; i < GRID_SIZE - 1; i++) {
    for (let j = 0; j < GRID_SIZE - 1; j++) {
      if (grid[i]?.[j] === 0 && grid[i+1]?.[j] === 0 && 
          grid[i]?.[j+1] === 0 && grid[i+1]?.[j+1] === 0) {
        openAreas++;
      }
    }
  }
  
  if (openAreas < 5) {
    return { valid: false, message: '❌ Map needs more open space! Add at least 5 open 2x2 areas for combat.' };
  }
  
  // Flood fill from first floor tile
  const visited = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false));
  const firstFloor = floors[0];
  if (!firstFloor) return { valid: false, message: '❌ No floor tiles found!' };
  
  const queue: [number, number][] = [firstFloor];
  const [startRow, startCol] = firstFloor;
  if (visited[startRow]?.[startCol] !== undefined) {
    visited[startRow][startCol] = true;
  }
  let reachableCount = 1;
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const [row, col] = current;
    const directions: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (
        newRow >= 0 && newRow < GRID_SIZE &&
        newCol >= 0 && newCol < GRID_SIZE &&
        visited[newRow]?.[newCol] === false &&
        grid[newRow]?.[newCol] === 0
      ) {
        visited[newRow][newCol] = true;
        queue.push([newRow, newCol]);
        reachableCount++;
      }
    }
  }
  
  if (reachableCount < floors.length) {
    return { 
      valid: false, 
      message: `❌ ${floors.length - reachableCount} floor tiles are unreachable! All floors must be connected.` 
    };
  }
  
  return { valid: true, message: '✅ Map is valid!' };
}

export function TileEditor() {
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)));
  const [copied, setCopied] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const toggleTile = (row: number, col: number) => {
    const newGrid = grid.map((r, i) =>
      r.map((c, j) => (i === row && j === col ? (c === 0 ? 1 : 0) : c))
    );
    setGrid(newGrid);
  };

  const clearGrid = () => {
    setGrid(Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)));
  };

  const fillGrid = () => {
    setGrid(Array(GRID_SIZE).fill(1).map(() => Array(GRID_SIZE).fill(1)));
  };

  const exportLayout = () => {
    const validation = isMapValid(grid);
    
    if (!validation.valid) {
      setValidationMessage(validation.message);
      setTimeout(() => setValidationMessage(''), 4000);
      return;
    }
    
    const layoutString = grid.flat().join('');
    navigator.clipboard.writeText(`Layout: ${layoutString}\nMonster: Goblin\nModifier: Normal Gravity`);
    setCopied(true);
    setValidationMessage('✅ Layout copied! Paste it in the comments.');
    setTimeout(() => {
      setCopied(false);
      setValidationMessage('');
    }, 3000);
  };

  const wallCount = grid.flat().filter(cell => cell === 1).length;
  const floorCount = GRID_SIZE * GRID_SIZE - wallCount;

  return (
    <div className="bg-white border-2 border-green-600 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold mb-2 text-green-800">🎨 Design Your Dungeon Room</h3>
      <p className="mb-4 text-sm text-gray-700">
        Click tiles to toggle walls (black) and floors (white). Your design could be tomorrow's dungeon!
      </p>
      
      {/* Grid */}
      <div className="flex justify-center mb-4">
        <div 
          className="grid gap-1 bg-green-100 p-2 rounded-lg border-2 border-green-300" 
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            width: 'min(400px, 90vw)',
            aspectRatio: '1/1'
          }}
        >
          {grid.map((row, i) =>
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                onClick={() => toggleTile(i, j)}
                className={`
                  border border-gray-400 cursor-pointer transition-all hover:scale-110 rounded
                  ${cell === 1 ? 'bg-gray-900' : 'bg-white'}
                `}
                style={{ aspectRatio: '1/1' }}
              />
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-4 mb-4 text-sm text-gray-800">
        <span>🧱 Walls: {wallCount}</span>
        <span>⬜ Floors: {floorCount}</span>
      </div>

      {/* Validation Message */}
      {validationMessage && (
        <div className={`mb-4 p-3 rounded-lg text-center font-medium ${
          validationMessage.startsWith('✅') 
            ? 'bg-green-100 text-green-800 border-2 border-green-400' 
            : 'bg-red-100 text-red-800 border-2 border-red-400'
        }`}>
          {validationMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button 
          onClick={clearGrid} 
          className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Clear All
        </button>
        <button 
          onClick={fillGrid} 
          className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Fill All
        </button>
        <button 
          onClick={() => {
            const validation = isMapValid(grid);
            setValidationMessage(validation.message);
            setTimeout(() => setValidationMessage(''), 4000);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          ✓ Check Map
        </button>
        <button 
          onClick={exportLayout} 
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy Layout String'}
        </button>
      </div>

      <p className="mt-4 text-xs text-center text-gray-600">
        💡 Tip: Need 20+ connected floors, 5+ open 2x2 areas for combat. Check your map before copying!
      </p>
    </div>
  );
}
