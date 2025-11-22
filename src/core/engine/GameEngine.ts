import { GridSystem } from '../systems/GridSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import { IconPoolSystem } from '../systems/IconPoolSystem'
import { CollectionSystem } from '../systems/CollectionSystem'
import { TierSystem } from '../systems/TierSystem'
import { FlowEngine } from './FlowEngine'
import { GAME_CONFIG } from '../../lib/constants'
import type { Building } from '../../stores/types'

/**
 * Tick Manager
 * Manages game ticks at a fixed rate
 */
class TickManager {
  private tickRate: number // ticks per second
  private intervalId: number | null = null
  private onTick: () => void

  constructor(tickRate: number, onTick: () => void) {
    this.tickRate = tickRate
    this.onTick = onTick
  }

  start(): void {
    if (this.intervalId !== null) {
      return // Already running
    }

    const interval = 1000 / this.tickRate
    this.intervalId = (globalThis.setInterval as typeof setInterval)(() => {
      this.onTick()
    }, interval)
  }

  stop(): void {
    if (this.intervalId !== null) {
      globalThis.clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null
  }

  setTickRate(tickRate: number): void {
    const wasRunning = this.isRunning()
    this.stop()
    this.tickRate = tickRate
    if (wasRunning) {
      this.start()
    }
  }
}

/**
 * Game Engine
 * Main game engine that coordinates all systems
 */
export class GameEngine {
  private gridSystem: GridSystem
  private resourceSystem: ResourceSystem
  private iconPoolSystem: IconPoolSystem
  private collectionSystem: CollectionSystem
  private tierSystem: TierSystem
  private flowEngine: FlowEngine
  private tickManager: TickManager

  private tier: number = 1
  private experience: bigint = 0n
  private level: number = 1
  private tickCount: bigint = 0n

  private onStateChange?: () => void

  constructor(onStateChange?: () => void) {
    this.onStateChange = onStateChange

    // Initialize systems
    this.gridSystem = new GridSystem(GAME_CONFIG.INITIAL_GRID_SIZE)
    this.resourceSystem = new ResourceSystem()
    this.iconPoolSystem = new IconPoolSystem()
    this.collectionSystem = new CollectionSystem()
    this.tierSystem = new TierSystem()
    this.flowEngine = new FlowEngine(
      this.gridSystem,
      this.resourceSystem,
      this.collectionSystem,
      (amount) => this.addExperience(amount)
    )

    // Initialize tick manager
    this.tickManager = new TickManager(GAME_CONFIG.TICK_RATE, () => this.tick())

    // Initialize starting resources
    this.initializeStartingResources()
  }

  /**
   * Initialize starting resources for Tier 1
   */
  private initializeStartingResources(): void {
    // Unlock resources for current tier
    this.unlockResourcesForTier(this.tier)

    // Generate initial recipes
    this.generateRecipesForTier(this.tier)
  }

  /**
   * Unlock resources for a specific tier
   */
  private unlockResourcesForTier(tier: number): void {
    const { characters, iconCount } = this.tierSystem.getResourcesForTier(tier)

    // Unlock characters
    for (const char of characters) {
      const resource = this.resourceSystem.unlockCharacter(char, tier)
      if (tier === 1) {
        resource.count = 10n // Start with 10 of the first resource
      }
    }

    // Unlock icons
    for (let i = 0; i < iconCount; i++) {
      const icon = this.iconPoolSystem.unlockNext(tier)
      if (icon) {
        this.resourceSystem.unlockIcon(icon.name, tier)
      }
    }
  }

  /**
   * Generate recipes for a specific tier
   */
  private generateRecipesForTier(tier: number): void {
    const allResources = this.resourceSystem.getAllResources()

    const characters = allResources
      .filter(r => r.type === 'character' && r.tier <= tier)
      .map(r => r.type === 'character' ? r.value : '')
      .filter(v => v !== '')

    const icons = allResources
      .filter(r => r.type === 'icon' && r.tier <= tier)
      .map(r => r.type === 'icon' ? r.iconName : '')
      .filter(v => v !== '')

    this.collectionSystem.generateRecipes(characters, icons, tier)
  }

  /**
   * Start the game engine
   */
  start(): void {
    this.tickManager.start()
  }

  /**
   * Stop the game engine
   */
  stop(): void {
    this.tickManager.stop()
  }

  /**
   * Check if engine is running
   */
  isRunning(): boolean {
    return this.tickManager.isRunning()
  }

  /**
   * Main tick function - called every tick
   */
  private tick(): void {
    this.tickCount++

    // Execute flow engine
    this.flowEngine.tick()

    // Notify state change
    if (this.onStateChange) {
      this.onStateChange()
    }
  }

  /**
   * Place a building on the grid
   */
  placeBuilding(building: Building): boolean {
    const success = this.gridSystem.placeBuilding(building)
    if (success && this.onStateChange) {
      this.onStateChange()
    }
    return success
  }

  /**
   * Remove a building from the grid
   */
  removeBuilding(x: number, y: number): Building | null {
    const building = this.gridSystem.removeBuilding(x, y)
    if (building && this.onStateChange) {
      this.onStateChange()
    }
    return building
  }

  /**
   * Rotate a building clockwise
   */
  rotateBuilding(x: number, y: number): boolean {
    const success = this.gridSystem.rotateBuilding(x, y)
    if (success && this.onStateChange) {
      this.onStateChange()
    }
    return success
  }

  /**
   * Get the grid system
   */
  getGridSystem(): GridSystem {
    return this.gridSystem
  }

  /**
   * Get the resource system
   */
  getResourceSystem(): ResourceSystem {
    return this.resourceSystem
  }

  /**
   * Get the icon pool system
   */
  getIconPoolSystem(): IconPoolSystem {
    return this.iconPoolSystem
  }

  /**
   * Get the collection system
   */
  getCollectionSystem(): CollectionSystem {
    return this.collectionSystem
  }

  /**
   * Get the tier system
   */
  getTierSystem(): TierSystem {
    return this.tierSystem
  }

  /**
   * Get current tier
   */
  getTier(): number {
    return this.tier
  }

  /**
   * Get current level
   */
  getLevel(): number {
    return this.level
  }

  /**
   * Get current experience
   */
  getExperience(): bigint {
    return this.experience
  }

  /**
   * Get tick count
   */
  getTickCount(): bigint {
    return this.tickCount
  }

  /**
   * Add experience
   */
  addExperience(amount: bigint): void {
    this.experience += amount
    this.checkLevelUp()
  }

  /**
   * Check if player should level up
   */
  private checkLevelUp(): void {
    const requiredExp = this.calculateRequiredExperience(this.level)
    if (this.experience >= requiredExp) {
      this.level++
      this.experience -= requiredExp
      if (this.onStateChange) {
        this.onStateChange()
      }
    }
  }

  /**
   * Calculate required experience for next level
   */
  private calculateRequiredExperience(level: number): bigint {
    return BigInt(Math.floor(Number(GAME_CONFIG.BASE_EXPERIENCE_REQUIREMENT) * Math.pow(GAME_CONFIG.EXPERIENCE_MULTIPLIER, level - 1)))
  }

  /**
   * Check if can advance to next tier
   */
  canAdvanceTier(): { canAdvance: boolean; reason?: string } {
    const progress = this.collectionSystem.getProgress()
    return this.tierSystem.canAdvanceTier(
      this.tier,
      this.level,
      progress.discovered,
      progress.total
    )
  }

  /**
   * Advance to next tier
   */
  advanceTier(): boolean {
    const check = this.canAdvanceTier()
    if (!check.canAdvance) {
      console.warn(`Cannot advance tier: ${check.reason}`)
      return false
    }

    this.tier++
    const tierConfig = this.tierSystem.getTierConfig(this.tier)

    // Expand grid
    this.gridSystem.initializeGrid(tierConfig.gridSize)

    // Unlock new resources
    this.unlockResourcesForTier(this.tier)

    // Generate new recipes
    this.generateRecipesForTier(this.tier)

    console.log(`Advanced to Tier ${this.tier}!`)

    if (this.onStateChange) {
      this.onStateChange()
    }

    return true
  }

  /**
   * Serialize game state for saving
   */
  serialize(): {
    tier: number
    level: number
    experience: string
    tickCount: string
    grid: ReturnType<GridSystem['serialize']>
    resources: ReturnType<ResourceSystem['serialize']>
    icons: ReturnType<IconPoolSystem['serialize']>
    collection: ReturnType<CollectionSystem['serialize']>
    flow: ReturnType<FlowEngine['serialize']>
  } {
    return {
      tier: this.tier,
      level: this.level,
      experience: this.experience.toString(),
      tickCount: this.tickCount.toString(),
      grid: this.gridSystem.serialize(),
      resources: this.resourceSystem.serialize(),
      icons: this.iconPoolSystem.serialize(),
      collection: this.collectionSystem.serialize(),
      flow: this.flowEngine.serialize(),
    }
  }

  /**
   * Deserialize game state from save data
   */
  deserialize(data: {
    tier: number
    level: number
    experience: string
    tickCount: string
    grid: Parameters<GridSystem['deserialize']>[0]
    resources: Parameters<ResourceSystem['deserialize']>[0]
    icons: Parameters<IconPoolSystem['deserialize']>[0]
    collection: Parameters<CollectionSystem['deserialize']>[0]
    flow: Parameters<FlowEngine['deserialize']>[0]
  }): void {
    this.tier = data.tier
    this.level = data.level
    this.experience = BigInt(data.experience)
    this.tickCount = BigInt(data.tickCount)

    this.gridSystem.deserialize(data.grid)
    this.resourceSystem.deserialize(data.resources)
    this.iconPoolSystem.deserialize(data.icons)
    this.collectionSystem.deserialize(data.collection)
    this.flowEngine.deserialize(data.flow)

    if (this.onStateChange) {
      this.onStateChange()
    }
  }
}
