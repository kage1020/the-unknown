import { useGameStore } from '../../stores/gameStore'
import { CellView } from './CellView'

export function GridCanvas() {
  const { grid } = useGameStore()

  return (
    <div className="p-4">
      <div className="inline-block bg-gray-950 p-2 rounded-lg">
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `repeat(${grid.width}, 4rem)`,
          }}
        >
          {grid.cells.map((row, y) =>
            row.map((cell, x) => <CellView key={`${x}-${y}`} cell={cell} />)
          )}
        </div>
      </div>
    </div>
  )
}
