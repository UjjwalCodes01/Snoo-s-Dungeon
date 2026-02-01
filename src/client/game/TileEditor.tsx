import { useState } from 'react';

const GRID_SIZE = 10;

export function TileEditor() {
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0)));
  const [copied, setCopied] = useState(false);

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
    const layoutString = grid.flat().join('');
    navigator.clipboard.writeText(`Layout: ${layoutString}\nMonster: Goblin\nModifier: Normal Gravity`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wallCount = grid.flat().filter(cell => cell === 1).length;
  const floorCount = GRID_SIZE * GRID_SIZE - wallCount;

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">🎨 Design Your Dungeon Room</h3>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Click tiles to toggle walls (black) and floors (white). Your design could be tomorrow's dungeon!
      </p>
      
      {/* Grid */}
      <div className="flex justify-center mb-4">
        <div 
          className="grid gap-1 bg-gray-200 dark:bg-gray-700 p-2 rounded" 
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
                  border border-gray-400 cursor-pointer transition-all hover:scale-110
                  ${cell === 1 ? 'bg-gray-900 dark:bg-gray-950' : 'bg-white dark:bg-gray-100'}
                `}
                style={{ aspectRatio: '1/1' }}
              />
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-4 mb-4 text-sm text-gray-700 dark:text-gray-300">
        <span>🧱 Walls: {wallCount}</span>
        <span>⬜ Floors: {floorCount}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button 
          onClick={clearGrid} 
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
        >
          Clear All
        </button>
        <button 
          onClick={fillGrid} 
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded transition-colors"
        >
          Fill All
        </button>
        <button 
          onClick={exportLayout} 
          className={`px-6 py-2 rounded font-semibold transition-all ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy Layout String'}
        </button>
      </div>

      <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
        💡 Tip: Paste your layout in the daily submission post comments. Top-voted designs become tomorrow's dungeon!
      </p>
    </div>
  );
}