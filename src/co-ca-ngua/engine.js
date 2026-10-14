export const TRACK_LENGTH = 56
export const COLORS = ['red', 'green', 'yellow', 'blue']
export const NAMES = ['Đỏ', 'Xanh lá', 'Vàng', 'Xanh dương']
export const HOME_START = 56
export const HOME_END = 61

export function createGame({ players = 2, startRule = 'one-or-six' } = {}) {
  if (![2, 3, 4].includes(players)) throw new Error('Cần 2–4 người chơi')
  if (!['one-or-six', 'six'].includes(startRule)) throw new Error('Luật ra chuồng không hợp lệ')
  const seats = players === 2 ? [0, 2] : Array.from({ length: players }, (_, i) => i)
  return { seats, startRule, horses: Array.from({ length: 4 }, () => [-1, -1, -1, -1]), current: 0, die: null, phase: 'roll', winner: null, message: `${NAMES[seats[0]]} gieo xúc xắc để bắt đầu.`, rollCursor: 0, tape: [], past: [], future: [] }
}
export function trackSquare(seat, progress) { return (seat * 14 + progress) % TRACK_LENGTH }
export function occupants(state, square) {
  return state.seats.flatMap(seat => state.horses[seat].flatMap((p, horse) => p >= 0 && p < HOME_START && trackSquare(seat, p) === square ? [{ seat, horse }] : []))
}
export function destination(state, horse) {
  if (state.phase !== 'move' || state.winner !== null || !Number.isInteger(horse) || horse < 0 || horse > 3) return null
  const seat = state.seats[state.current], progress = state.horses[seat][horse], die = state.die
  if (progress === -1) {
    if (die !== 6 && !(die === 1 && state.startRule === 'one-or-six')) return null
    if (occupants(state, trackSquare(seat, 0)).some(o => o.seat === seat)) return null
    return 0
  }
  const target = progress + die
  if (target > HOME_END) return null
  for (let p = progress + 1; p <= target; p++) {
    if (p < HOME_START) {
      const occupied = occupants(state, trackSquare(seat, p))
      if (occupied.some(o => p < target || o.seat === seat)) return null
    } else if (state.horses[seat].some((v, i) => i !== horse && v === p)) return null
  }
  return target
}
export function legalMoves(state) {
  return Array.from({ length: 4 }, (_, horse) => ({ horse, to: destination(state, horse) })).filter(m => m.to !== null)
}
const snapshot = ({ past, future, tape, ...state }) => structuredClone(state)
function commit(before, after) { return { ...after, past: [...before.past, snapshot(before)], future: [] } }
function nextTurn(state, die) { return die === 6 ? state.current : (state.current + 1) % state.seats.length }
export function rollDice(state, rng = Math.random) {
  if (state.phase !== 'roll' || state.winner !== null) return state
  let tape = [...state.tape]
  if (state.rollCursor === tape.length) {
    const random = rng()
    if (!Number.isFinite(random) || random < 0 || random >= 1) throw new Error('RNG phải trả số trong [0, 1)')
    tape.push(Math.floor(random * 6) + 1)
  }
  const die = tape[state.rollCursor], seat = state.seats[state.current]
  let after = { ...state, tape, rollCursor: state.rollCursor + 1, die, phase: 'move', message: `${NAMES[seat]} gieo được ${die}. Chọn ngựa được viền sáng.` }
  if (!legalMoves(after).length) {
    after = { ...after, phase: 'roll', current: nextTurn(state, die), message: `${NAMES[seat]} gieo ${die}: không có nước hợp lệ.${die === 6 ? ' Được gieo tiếp.' : ' Chuyển lượt.'}` }
  }
  return commit(state, after)
}
export function moveHorse(state, horse) {
  const target = destination(state, horse)
  if (target === null) return state
  const seat = state.seats[state.current], horses = state.horses.map(row => [...row])
  let capture = ''
  if (target < HOME_START) {
    for (const victim of occupants(state, trackSquare(seat, target))) {
      horses[victim.seat][victim.horse] = -1
      capture = ` Đá ngựa ${NAMES[victim.seat]} về chuồng.`
    }
  }
  horses[seat][horse] = target
  const won = [58, 59, 60, 61].every(p => horses[seat].includes(p))
  return commit(state, { ...state, horses, phase: won ? 'finished' : 'roll', winner: won ? seat : null, current: won ? state.current : nextTurn(state, state.die), message: won ? `${NAMES[seat]} chiến thắng! Bốn ngựa đã ở ô đích 3, 4, 5, 6.` : `${NAMES[seat]} đi ngựa ${horse + 1}.${capture}${state.die === 6 ? ' Gieo 6 được thêm lượt.' : ''}` })
}
export function undo(state) {
  if (!state.past.length) return state
  return { ...structuredClone(state.past.at(-1)), tape: state.tape, past: state.past.slice(0, -1), future: [snapshot(state), ...state.future] }
}
export function redo(state) {
  if (!state.future.length) return state
  return { ...structuredClone(state.future[0]), tape: state.tape, past: [...state.past, snapshot(state)], future: state.future.slice(1) }
}
