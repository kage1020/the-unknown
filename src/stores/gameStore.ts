import { create } from 'zustand'
import { GameEngine } from '../core/engine/GameEngine'
import type { Building, Grid, Resource, BuildingType, Direction } from './types'
import { saveGame, loadGame } from '../lib/db'

interface GameStore {
  // Game engine instance
  engine: GameEngine

  // UI state
  selectedBuildingType: BuildingType | null
  selectedDirection: Direction
  isRunning: boolean

  // Derived state (for React reactivity)
  grid: Grid
  resources: Resource[]
  tier: number
  level: number
  experience: bigint
  tickCount: bigint

  // Actions
  startEngine: () => void
  stopEngine: () => void
  toggleEngine: () => void
  placeBuilding: (x: number, y: number, type: BuildingType) => void
  removeBuilding: (x: number, y: number) => void
  rotateBuilding: (x: number, y: number) => void
  selectBuildingType: (type: BuildingType | null) => void
  setDirection: (direction: Direction) => void
  updateState: () => void
  saveGame: (saveId?: string) => Promise<void>
  loadGame: (saveId?: string) => Promise<void>
  advanceTier: () => void
}

export const useGameStore = create<GameStore>((set, get) => {
  // Create engine instance with state update callback
  const engine = new GameEngine(() => {
    get().updateState()
  })

  return {
    // Initial state
    engine,
    selectedBuildingType: null,
    selectedDirection: 'right',
    isRunning: false,
    grid: engine.getGridSystem().getGrid(),
    resources: engine.getResourceSystem().getAllResources(),
    tier: engine.getTier(),
    level: engine.getLevel(),
    experience: engine.getExperience(),
    tickCount: engine.getTickCount(),

    // Actions
    startEngine: () => {
      const { engine } = get()
      engine.start()
      set({ isRunning: true })
    },

    stopEngine: () => {
      const { engine } = get()
      engine.stop()
      set({ isRunning: false })
    },

    toggleEngine: () => {
      const { engine, isRunning } = get()
      if (isRunning) {
        engine.stop()
        set({ isRunning: false })
      } else {
        engine.start()
        set({ isRunning: true })
      }
    },

    placeBuilding: (x: number, y: number, type: BuildingType) => {
      const { engine, selectedDirection } = get()

      // Get first available recipe for generators
      let recipe = undefined
      if (type === 'Generator') {
        const resources = engine.getResourceSystem().getAllResources()
        if (resources.length > 0) {
          const firstResource = resources[0]
          recipe = {
            id: `gen-${firstResource.type}-${firstResource.type === 'character' ? firstResource.value : firstResource.iconName}`,
            inputs: [],
            output: {
              type: firstResource.type,
              value: firstResource.type === 'character' ? firstResource.value : firstResource.iconName,
            },
            tier: firstResource.tier,
            discovered: true,
            rarity: 0,
          }
        }
      }

      const building: Building = {
        id: `building-${Date.now()}-${Math.random()}`,
        type,
        position: { x, y },
        direction: selectedDirection,
        tier: engine.getTier(),
        recipe,
      }

      const success = engine.placeBuilding(building)
      if (success) {
        get().updateState()
      }
    },

    removeBuilding: (x: number, y: number) => {
      const { engine } = get()
      engine.removeBuilding(x, y)
      get().updateState()
    },

    rotateBuilding: (x: number, y: number) => {
      const { engine } = get()
      engine.rotateBuilding(x, y)
      get().updateState()
    },

    selectBuildingType: (type: BuildingType | null) => {
      set({ selectedBuildingType: type })
    },

    setDirection: (direction: Direction) => {
      set({ selectedDirection: direction })
    },

    updateState: () => {
      const { engine } = get()
      set({
        grid: engine.getGridSystem().getGrid(),
        resources: engine.getResourceSystem().getAllResources(),
        tier: engine.getTier(),
        level: engine.getLevel(),
        experience: engine.getExperience(),
        tickCount: engine.getTickCount(),
      })
    },

    saveGame: async (saveId: string = 'autosave') => {
      const { engine } = get()
      const data = engine.serialize()
      await saveGame(saveId, data)
    },

    loadGame: async (saveId: string = 'autosave') => {
      const { engine } = get()
      const data = await loadGame(saveId)

      if (data) {
        // Stop engine before loading
        engine.stop()
        set({ isRunning: false })

        // Load data
        engine.deserialize(data as Parameters<typeof engine.deserialize>[0])

        // Update state
        get().updateState()
      }
    },

    advanceTier: () => {
      const { engine } = get()
      const success = engine.advanceTier()
      if (success) {
        get().updateState()
      }
    },
  }
})
