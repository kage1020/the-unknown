import { useGameStore } from '../../stores/gameStore'
import { getIconByName } from '../../lib/icons'

export function ResourceDisplay() {
  const { resources, tier, level, experience, tickCount } = useGameStore()

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Game Info</h2>

      {/* Game stats */}
      <div className="mb-4 space-y-1">
        <div className="text-sm">
          <span className="text-gray-400">Tier:</span> <span className="font-bold">{tier}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Level:</span> <span className="font-bold">{level}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Experience:</span>{' '}
          <span className="font-bold">{experience.toString()}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Ticks:</span>{' '}
          <span className="font-bold">{tickCount.toString()}</span>
        </div>
      </div>

      {/* Resources */}
      <h3 className="text-lg font-semibold mb-2">Resources</h3>
      <div className="space-y-2">
        {resources.length === 0 && (
          <div className="text-gray-500 text-sm">No resources yet</div>
        )}

        {resources.map((resource) => {
          const ResourceIcon =
            resource.type === 'icon' ? getIconByName(resource.iconName) : null

          return (
            <div
              key={`${resource.type}-${resource.type === 'character' ? resource.value : resource.iconName}`}
              className="flex items-center justify-between bg-gray-800 p-2 rounded"
            >
              <div className="flex items-center gap-2">
                {resource.type === 'character' ? (
                  <span className="text-lg font-mono font-bold">{resource.value}</span>
                ) : ResourceIcon ? (
                  <ResourceIcon size={20} />
                ) : (
                  <span>🎨</span>
                )}
                <span className="text-sm text-gray-400">
                  {resource.type === 'character' ? 'Character' : 'Icon'}
                </span>
              </div>
              <span className="font-bold">{resource.count.toString()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
