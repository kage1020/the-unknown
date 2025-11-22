import { useGameStore } from '../../stores/gameStore'
import type { BuildingType } from '../../stores/types'
import { cn } from '../../lib/utils'

export function BuildingMenu() {
  const {
    selectedBuildingType,
    selectBuildingType,
    isRunning,
    toggleEngine,
  } = useGameStore()

  const buildings: { type: BuildingType; icon: string; name: string; description: string }[] = [
    { type: 'Generator', icon: '⚙️', name: 'Generator', description: 'Generates resources' },
    { type: 'Output', icon: '📦', name: 'Output', description: 'Collects resources' },
    // Conveyor and Merger will be added in Phase 2
  ]

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Buildings</h2>

      {/* Engine controls */}
      <div className="mb-4 space-y-2">
        <button
          onClick={toggleEngine}
          className={cn(
            'w-full px-4 py-2 rounded font-semibold transition-colors',
            isRunning
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          )}
        >
          {isRunning ? '⏸️ Pause' : '▶️ Start'}
        </button>
      </div>

      {/* Building selection */}
      <div className="space-y-2">
        {buildings.map((building) => (
          <button
            key={building.type}
            onClick={() =>
              selectBuildingType(
                selectedBuildingType === building.type ? null : building.type
              )
            }
            className={cn(
              'w-full p-3 rounded transition-colors text-left',
              selectedBuildingType === building.type
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-800 hover:bg-gray-700'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{building.icon}</span>
              <div className="flex-1">
                <div className="font-semibold">{building.name}</div>
                <div className="text-xs text-gray-400">{building.description}</div>
              </div>
            </div>
          </button>
        ))}

        {/* Clear selection */}
        {selectedBuildingType && (
          <button
            onClick={() => selectBuildingType(null)}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>
    </div>
  )
}
