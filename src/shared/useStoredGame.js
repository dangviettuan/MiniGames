import { useEffect, useState } from 'react'
import { loadGame, saveGame } from './storage.js'
const browserStorage = () => { try { return window.localStorage } catch { return null } }
export function useStoredGame(id, createInitial, validate, codec = {}) {
  const { encode, decode } = codec
  const [state, setState] = useState(() => loadGame(browserStorage(), id, createInitial, validate, { decode }))
  const [saved, setSaved] = useState('saved')
  useEffect(() => { setSaved(saveGame(browserStorage(), id, state, { encode }) ? 'saved' : 'unavailable') }, [id, state, encode])
  return [state, setState, saved]
}
