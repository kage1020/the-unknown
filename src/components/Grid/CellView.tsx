import type { Cell } from '../../stores/types'
import { getIconByName } from '../../lib/icons'
import { useGameStore } from '../../stores/gameStore'
import { cn } from '../../lib/utils'

interface CellViewProps {
  cell: Cell
}

export function CellView({ cell }: CellViewProps) {
  const { selectedBuildingType, placeBuilding, removeBuilding, rotateBuilding } = useGameStore()

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && cell.building) {
      // Rotate building with Shift+Click
      rotateBuilding(cell.x, cell.y)
    } else if (cell.building) {
      // Remove building on click
      removeBuilding(cell.x, cell.y)
    } else if (selectedBuildingType) {
      // Place building
      placeBuilding(cell.x, cell.y, selectedBuildingType)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (cell.building) {
      // Rotate building on right-click
      rotateBuilding(cell.x, cell.y)
    }
  }

  const getBuildingIcon = () => {
    if (!cell.building) return null

    const iconMap = {
      Generator: '⚙️',
      Conveyor: '➡️',
      Merger: '🔀',
      Output: '📦',
    }

    return iconMap[cell.building.type] || '?'
  }

  const getDirectionRotation = () => {
    if (!cell.building) return 0

    const rotationMap = {
      up: 0,
      right: 90,
      down: 180,
      left: 270,
    }

    return rotationMap[cell.building.direction] || 0
  }

  const getBuildingColor = () => {
    if (!cell.building) return 'bg-gray-800'

    const colorMap = {
      Generator: 'bg-blue-600',
      Conveyor: 'bg-green-600',
      Merger: 'bg-purple-600',
      Output: 'bg-orange-600',
    }

    return colorMap[cell.building.type] || 'bg-gray-600'
  }

  const ResourceIcon = cell.resource?.type === 'icon' ? getIconByName(cell.resource.iconName) : null

  return (
    <div
      className={cn(
        'relative w-16 h-16 border border-gray-700 cursor-pointer',
        'transition-colors hover:border-gray-500',
        cell.building ? getBuildingColor() : 'bg-gray-900'
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Building */}
      {cell.building && (
        <div
          className="absolute inset-0 flex items-center justify-center text-2xl transition-transform"
          style={{ transform: `rotate(${getDirectionRotation()}deg)` }}
        >
          {getBuildingIcon()}
        </div>
      )}

      {/* Direction indicator for directional buildings */}
      {cell.building && cell.building.type !== 'Output' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white opacity-50"
          style={{ transform: `translateX(-50%) rotate(${getDirectionRotation()}deg)`, transformOrigin: 'center 8px' }}
        />
      )}

      {/* Resource on cell */}
      {cell.resource && (
        <div className="absolute top-1 right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold">
          {cell.resource.type === 'character' ? (
            cell.resource.value
          ) : ResourceIcon ? (
            <ResourceIcon size={16} />
          ) : (
            '🎨'
          )}
        </div>
      )}

      {/* Coordinates (debug) */}
      <div className="absolute bottom-0 left-0 text-[8px] text-gray-600 px-0.5">
        {cell.x},{cell.y}
      </div>
    </div>
  )
}
