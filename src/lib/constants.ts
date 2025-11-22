import type { Direction } from '../stores/types'

// Game configuration
export const GAME_CONFIG = {
  TICK_RATE: 10, // ticks per second
  INITIAL_GRID_SIZE: 5, // 5x5 grid for Tier 1
  MAX_TIER: 10,
  BASE_EXPERIENCE_REQUIREMENT: 100n,
  EXPERIENCE_MULTIPLIER: 1.5,
} as const

// Base58 character set
export const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// Building types configuration
export const BUILDING_TYPES = {
  Generator: {
    name: 'Generator',
    description: 'Generates resources from recipes',
    cost: 10n,
    ticksPerGeneration: 10, // Generate every 10 ticks (1 second)
  },
  Conveyor: {
    name: 'Conveyor',
    description: 'Moves resources in a direction',
    cost: 5n,
    ticksPerMove: 5, // Move every 5 ticks (0.5 seconds)
  },
  Merger: {
    name: 'Merger',
    description: 'Merges resources according to recipes',
    cost: 20n,
    ticksPerMerge: 15, // Merge every 15 ticks (1.5 seconds)
  },
  Output: {
    name: 'Output',
    description: 'Collects resources',
    cost: 5n,
  },
} as const

// Directions for buildings
export const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

// Direction vectors for grid navigation
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

// Tier configurations
export const TIER_CONFIG = [
  { tier: 1, gridSize: 5, characters: 1, icons: 1 },
  { tier: 2, gridSize: 7, characters: 2, icons: 2 },
  { tier: 3, gridSize: 10, characters: 3, icons: 3 },
  { tier: 4, gridSize: 12, characters: 4, icons: 4 },
  { tier: 5, gridSize: 15, characters: 5, icons: 5 },
  { tier: 6, gridSize: 15, characters: 6, icons: 6 },
  { tier: 7, gridSize: 18, characters: 7, icons: 7 },
  { tier: 8, gridSize: 18, characters: 8, icons: 8 },
  { tier: 9, gridSize: 20, characters: 9, icons: 9 },
  { tier: 10, gridSize: 20, characters: 10, icons: 10 },
]
