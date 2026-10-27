export const storageKey = id => `minigames:game:v1:${id}`
export function loadGame(storage, id, createInitial, validate, codec = {}) {
  try {
    const raw = storage?.getItem(storageKey(id))
    if (raw) {
      const envelope = JSON.parse(raw)
      if (envelope.version === 1) {
        const data = codec.decode ? codec.decode(envelope.data) : envelope.data
        if (validate(data)) return data
      }
    }
  } catch {}
  return createInitial()
}
export function saveGame(storage, id, data, codec = {}) {
  try {
    if (!storage) return false
    storage.setItem(storageKey(id), JSON.stringify({ version: 1, data: codec.encode ? codec.encode(data) : data }))
    return true
  } catch { return false }
}
