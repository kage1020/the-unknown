import type { Resource, CharacterResource, IconResource, ResourceId } from '../../stores/types'
import { generateResourceId } from '../utils/hash'

/**
 * Resource System
 * Manages resource inventory, production, and consumption
 */
export class ResourceSystem {
  private resources: Map<string, Resource> = new Map()

  /**
   * Unlock a character resource
   */
  unlockCharacter(character: string, tier: number): CharacterResource {
    const id = generateResourceId('character', character)

    if (this.resources.has(id)) {
      return this.resources.get(id) as CharacterResource
    }

    const resource: CharacterResource = {
      type: 'character',
      value: character,
      tier,
      count: 0n,
    }

    this.resources.set(id, resource)
    return resource
  }

  /**
   * Unlock an icon resource
   */
  unlockIcon(iconName: string, tier: number): IconResource {
    const id = generateResourceId('icon', iconName)

    if (this.resources.has(id)) {
      return this.resources.get(id) as IconResource
    }

    const resource: IconResource = {
      type: 'icon',
      iconName,
      tier,
      count: 0n,
    }

    this.resources.set(id, resource)
    return resource
  }

  /**
   * Produce (add) resources
   */
  produce(resourceId: ResourceId, amount: bigint = 1n): boolean {
    const id = generateResourceId(resourceId.type, resourceId.value)
    const resource = this.resources.get(id)

    if (!resource) {
      console.warn(`Resource not found: ${id}`)
      return false
    }

    resource.count += amount
    return true
  }

  /**
   * Consume (remove) resources
   */
  consume(resourceId: ResourceId, amount: bigint = 1n): boolean {
    const id = generateResourceId(resourceId.type, resourceId.value)
    const resource = this.resources.get(id)

    if (!resource) {
      console.warn(`Resource not found: ${id}`)
      return false
    }

    if (resource.count < amount) {
      console.warn(`Insufficient resources: ${id}`)
      return false
    }

    resource.count -= amount
    return true
  }

  /**
   * Check if enough resources are available
   */
  hasEnough(resourceId: ResourceId, amount: bigint = 1n): boolean {
    const id = generateResourceId(resourceId.type, resourceId.value)
    const resource = this.resources.get(id)
    return resource ? resource.count >= amount : false
  }

  /**
   * Get resource by ID
   */
  getResource(resourceId: ResourceId): Resource | null {
    const id = generateResourceId(resourceId.type, resourceId.value)
    return this.resources.get(id) || null
  }

  /**
   * Get all resources
   */
  getAllResources(): Resource[] {
    return Array.from(this.resources.values())
  }

  /**
   * Get resources by type
   */
  getResourcesByType(type: 'character' | 'icon'): Resource[] {
    return this.getAllResources().filter((r) => r.type === type)
  }

  /**
   * Get resources by tier
   */
  getResourcesByTier(tier: number): Resource[] {
    return this.getAllResources().filter((r) => r.tier === tier)
  }

  /**
   * Clear all resources (reset counts to 0)
   */
  clearAll(): void {
    for (const resource of this.resources.values()) {
      resource.count = 0n
    }
  }

  /**
   * Serialize state for saving
   */
  serialize(): { type: string; value: string; tier: number; count: string }[] {
    return this.getAllResources().map((resource) => ({
      type: resource.type,
      value: resource.type === 'character' ? resource.value : resource.iconName,
      tier: resource.tier,
      count: resource.count.toString(),
    }))
  }

  /**
   * Deserialize state from save data
   */
  deserialize(
    data: { type: string; value: string; tier: number; count: string }[]
  ): void {
    this.resources.clear()

    for (const item of data) {
      if (item.type === 'character') {
        const resource = this.unlockCharacter(item.value, item.tier)
        resource.count = BigInt(item.count)
      } else if (item.type === 'icon') {
        const resource = this.unlockIcon(item.value, item.tier)
        resource.count = BigInt(item.count)
      }
    }
  }
}
