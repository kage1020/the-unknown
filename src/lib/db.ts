import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'TheUnknownDB'
const DB_VERSION = 1
const SAVE_STORE = 'saves'

interface SaveData {
  id: string
  timestamp: number
  data: unknown
}

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create save store if it doesn't exist
      if (!db.objectStoreNames.contains(SAVE_STORE)) {
        db.createObjectStore(SAVE_STORE, { keyPath: 'id' })
      }
    },
  })
}

/**
 * Save game state to IndexedDB
 */
export async function saveGame(saveId: string, data: unknown): Promise<void> {
  try {
    const db = await initDB()

    const saveData: SaveData = {
      id: saveId,
      timestamp: Date.now(),
      data,
    }

    await db.put(SAVE_STORE, saveData)
    console.log(`Game saved successfully: ${saveId}`)
  } catch (error) {
    console.error('Failed to save game:', error)
    throw error
  }
}

/**
 * Load game state from IndexedDB
 */
export async function loadGame(saveId: string): Promise<unknown | null> {
  try {
    const db = await initDB()
    const saveData = await db.get(SAVE_STORE, saveId)

    if (saveData) {
      console.log(`Game loaded successfully: ${saveId}`)
      return saveData.data
    }

    return null
  } catch (error) {
    console.error('Failed to load game:', error)
    throw error
  }
}

/**
 * Get all saves
 */
export async function getAllSaves(): Promise<SaveData[]> {
  try {
    const db = await initDB()
    return await db.getAll(SAVE_STORE)
  } catch (error) {
    console.error('Failed to get saves:', error)
    throw error
  }
}

/**
 * Delete a save
 */
export async function deleteSave(saveId: string): Promise<void> {
  try {
    const db = await initDB()
    await db.delete(SAVE_STORE, saveId)
    console.log(`Save deleted: ${saveId}`)
  } catch (error) {
    console.error('Failed to delete save:', error)
    throw error
  }
}

/**
 * Auto-save game
 */
export async function autoSave(data: unknown): Promise<void> {
  return saveGame('autosave', data)
}

/**
 * Load auto-save
 */
export async function loadAutoSave(): Promise<unknown | null> {
  return loadGame('autosave')
}
