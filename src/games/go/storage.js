const color = value => value === 'black' || value === 'white'
const totals = value => value && ['black', 'white'].every(side => Number.isFinite(value[side]) && value[side] >= 0)
const validPosition = value => {
  if (!value || ![9, 13, 19].includes(value.size) || value.komi !== 7.5 || !Array.isArray(value.board) || value.board.length !== value.size ** 2 || !value.board.every(stone => stone === null || color(stone))) return false
  const length = value.board.length
  if (!color(value.turn) || !['play', 'scoring', 'finished'].includes(value.phase) || ![0, 1, 2].includes(value.passes) || !totals(value.captures) || !Array.isArray(value.dead) || !value.dead.every(index => Number.isInteger(index) && index >= 0 && index < length && color(value.board[index])) || new Set(value.dead).size !== value.dead.length || !value.agreements || typeof value.agreements.black !== 'boolean' || typeof value.agreements.white !== 'boolean') return false
  if (!Array.isArray(value.positions) || !value.positions.length || !value.positions.every(position => typeof position === 'string' && position.length === length && /^[bw.]+$/.test(position))) return false
  const key = value.board.map(stone => stone === 'black' ? 'b' : stone === 'white' ? 'w' : '.').join('')
  if (!value.positions.includes(key)) return false
  if (value.lastMove !== null) {
    const move = value.lastMove
    if (!move || !['play', 'pass', 'mark', 'confirm', 'resume', 'resign'].includes(move.type)) return false
    if (['play', 'pass', 'confirm', 'resign'].includes(move.type) && !color(move.color)) return false
    if (['play', 'mark'].includes(move.type) && (!Number.isInteger(move.index) || move.index < 0 || move.index >= length)) return false
    if (move.type === 'play' && (!Number.isInteger(move.captured) || move.captured < 0)) return false
  }
  if (value.score !== null && (!value.score || !totals(value.score.area) || !totals(value.score.stones) || !totals(value.score.territory) || !totals(value.score.totals) || !Number.isFinite(value.score.neutral))) return false
  if (value.phase === 'finished') {
    if (!value.winner || !['black', 'white', 'draw'].includes(value.winner.color) || !['score', 'resign'].includes(value.winner.reason)) return false
    if (value.winner.reason === 'resign' && value.score !== null) return false
    if (value.winner.reason === 'score' && (!value.score || !totals(value.score.stones) || !totals(value.score.territory) || !totals(value.score.totals) || !Number.isFinite(value.score.neutral) || !Number.isFinite(value.winner.margin))) return false
  } else if (value.winner !== null || value.score !== null) return false
  return true
}
export const validateSavedGo = value => validPosition(value) && Array.isArray(value.past) && Array.isArray(value.future) && [...value.past, ...value.future].every(position => validPosition(position) && position.size === value.size)

// A board-position string is shared by many undo snapshots. Deduplicating it
// avoids quadratic storage growth while preserving every repetition history.
export function encodeGo(state) {
  const positionTable = [], ids = new Map()
  const packPosition = position => ({ ...position, positions: position.positions.map(key => {
    if (!ids.has(key)) { ids.set(key, positionTable.length); positionTable.push(key) }
    return ids.get(key)
  }) })
  const { past, future, ...current } = state
  return { format: 'go-history-v1', positionTable, game: { ...packPosition(current), past: past.map(packPosition), future: future.map(packPosition) } }
}

export function decodeGo(record) {
  // Preserve v1 saves made before the UI redesign.
  if (!record || record.format !== 'go-history-v1') return record
  if (!Array.isArray(record.positionTable) || !record.game || !Array.isArray(record.game.past) || !Array.isArray(record.game.future)) throw new Error('Invalid saved Go history')
  const unpackPosition = position => {
    if (!position || !Array.isArray(position.positions)) throw new Error('Invalid Go repetition history')
    return { ...position, positions: position.positions.map(id => {
      if (!Number.isInteger(id) || id < 0 || id >= record.positionTable.length || typeof record.positionTable[id] !== 'string') throw new Error('Invalid Go repetition reference')
      return record.positionTable[id]
    }) }
  }
  const { past, future, ...current } = record.game
  return { ...unpackPosition(current), past: past.map(unpackPosition), future: future.map(unpackPosition) }
}

export const goStorageCodec = { encode: encodeGo, decode: decodeGo }
