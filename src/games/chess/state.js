import { initialState, makeMove, makeMoveAndClaim, claimDraw, resign } from '../../chess/engine.js'
export const createStoredChess = () => ({ timeline:[initialState()], cursor:0, flipped:false, claimOnMove:false })
export function encodeStoredChess(value) {
  const positionKeys = value.timeline.at(-1).positions
  return {...value, format:'positions-prefix-v1', positionKeys, timeline:value.timeline.map(state => ({...state, positions:state.positions.length}))}
}
export function decodeStoredChess(value) {
  // Existing uncompressed v1 saves remain readable.
  if(value?.format !== 'positions-prefix-v1') return value
  const {format,positionKeys,timeline,...rest}=value
  if(!Array.isArray(positionKeys) || !Array.isArray(timeline)) throw new Error('Invalid chess save')
  return {...rest,timeline:timeline.map(state => {
    if(!Number.isInteger(state.positions) || state.positions<1 || state.positions>positionKeys.length) throw new Error('Invalid repetition history')
    return {...state,positions:positionKeys.slice(0,state.positions)}
  })}
}
const snapshot = state => JSON.stringify(['board','turn','castling','ep','halfmove','fullmove','positions','result','lastMove'].map(key => state[key]))
export function validateStoredChess(value) {
  try {
    if (!value || !Array.isArray(value.timeline) || !value.timeline.length || value.timeline.length > 5000 || !Number.isInteger(value.cursor) || value.cursor < 0 || value.cursor >= value.timeline.length || typeof value.flipped !== 'boolean' || typeof value.claimOnMove !== 'boolean') return false
    let previous = initialState()
    if (snapshot(value.timeline[0]) !== snapshot(previous)) return false
    // Replay every transition, including the redo tail. This verifies board contents,
    // rights, counters, repetitions and terminal results instead of trusting JSON shape.
    for (const candidate of value.timeline.slice(1)) {
      let next
      const reason = candidate.result?.reason
      if (reason?.startsWith('resignation')) next = resign(previous)
      else if (['repetition','fifty-move'].includes(reason) && JSON.stringify(candidate.board) === JSON.stringify(previous.board)) next = claimDraw(previous,reason)
      else next = ['repetition','fifty-move'].includes(reason) ? makeMoveAndClaim(previous,candidate.lastMove) : makeMove(previous,candidate.lastMove)
      if (snapshot(candidate) !== snapshot(next)) return false
      previous = next
    }
    return true
  } catch { return false }
}
