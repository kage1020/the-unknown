import { GridSystem } from '../systems/GridSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import { IconPoolSystem } from '../systems/IconPoolSystem'
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
    this.intervalId = window.setInterval(() => {
      this.onTick()
    }, interval)
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId)
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
    this.flowEngine = new FlowEngine(this.gridSystem, this.resourceSystem)

    // Initialize tick manager
    this.tickManager = new TickManager(GAME_CONFIG.TICK_RATE, () => this.tick())

    // Initialize starting resources
    this.initializeStartingResources()
  }

  /**
   * Initialize starting resources for Tier 1
   */
  private initializeStartingResources(): void {
    // Unlock first character
    const firstChar = this.resourceSystem.unlockCharacter('1', 1)
    firstChar.count = 10n // Start with 10 of the first resource

    // Unlock first icon
    const firstIcon = this.iconPoolSystem.unlockNext(1)
    if (firstIcon) {
      this.resourceSystem.unlockIcon(firstIcon.name, 1)
    }
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
    flow: Parameters<FlowEngine['deserialize']>[0]
  }): void {
    this.tier = data.tier
    this.level = data.level
    this.experience = BigInt(data.experience)
    this.tickCount = BigInt(data.tickCount)

    this.gridSystem.deserialize(data.grid)
    this.resourceSystem.deserialize(data.resources)
    this.iconPoolSystem.deserialize(data.icons)
    this.flowEngine.deserialize(data.flow)

    if (this.onStateChange) {
      this.onStateChange()
    }
  }
}
