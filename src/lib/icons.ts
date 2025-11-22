import * as LucideIcons from 'lucide-react'
import type { IconData } from '../stores/types'

// Type for Lucide icon components
type LucideIcon = React.ComponentType<{ size?: number; color?: string }>

/**
 * Get all available Lucide icons
 * Filters out non-icon exports like 'createLucideIcon'
 */
export function getAllIcons(): IconData[] {
  const icons: IconData[] = []

  for (const [name, component] of Object.entries(LucideIcons)) {
    // Filter out non-icon exports
    if (
      typeof component === 'function' &&
      name !== 'createLucideIcon' &&
      !name.startsWith('Lucide') &&
      name[0] === name[0].toUpperCase() // Icons start with uppercase
    ) {
      icons.push({
        name,
        component: component as LucideIcon,
        tier: 0, // Will be set when unlocked
        unlocked: false,
      })
    }
  }

  return icons
}

/**
 * Get icon by name
 */
export function getIconByName(name: string): LucideIcon | null {
  const icon = LucideIcons[name as keyof typeof LucideIcons]
  if (typeof icon === 'function') {
    return icon as LucideIcon
  }
  return null
}
