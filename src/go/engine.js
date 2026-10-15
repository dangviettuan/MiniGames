// Pure, immutable local Go engine. Coordinates are zero-based board indexes.
export const BLACK = 'black'
export const WHITE = 'white'
export const other = color => color === BLACK ? WHITE : BLACK
const keyOf = board => board.map(value => value === BLACK ? 'b' : value === WHITE ? 'w' : '.').join('')
const fail = (state, error) => ({ ok: false, state, error })
const snapshot = ({ past, future, ...position }) => structuredClone(position)
const advance = (state, changes) => ({ ...snapshot(state), ...changes, past: [...state.past, snapshot(state)], future: [] })
const success = state => ({ ok: true, state })

export function createGame(size = 9, komi = 7.5) {
  if (![9, 13, 19].includes(size)) throw new Error('Board size must be 9, 13, or 19')
  if (!Number.isFinite(komi)) throw new Error('Komi must be finite')
  const board = Array(size * size).fill(null)
  return { size, komi, board, turn: BLACK, phase: 'play', passes: 0, captures: { black: 0, white: 0 }, dead: [], agreements: { black: false, white: false }, winner: null, score: null, lastMove: null, positions: [keyOf(board)], past: [], future: [] }
}

export function neighbors(index, size) {
  const row = Math.floor(index / size), col = index % size
  return [row > 0 ? index - size : -1, col > 0 ? index - 1 : -1, col < size - 1 ? index + 1 : -1, row < size - 1 ? index + size : -1].filter(i => i >= 0)
}

export function getGroup(board, size, start) {
  if (!Number.isInteger(start) || start < 0 || start >= board.length || !board[start]) return { stones: [], liberties: [] }
  const color = board[start], seen = new Set([start]), liberties = new Set(), queue = [start]
  while (queue.length) {
    for (const index of neighbors(queue.pop(), size)) {
      if (!board[index]) liberties.add(index)
      else if (board[index] === color && !seen.has(index)) { seen.add(index); queue.push(index) }
    }
  }
  return { stones: [...seen], liberties: [...liberties] }
}

export function play(state, index) {
  if (state.phase !== 'play') return fail(state, 'Ván không ở giai đoạn đặt quân.')
  if (!Number.isInteger(index) || index < 0 || index >= state.board.length) return fail(state, 'Giao điểm không hợp lệ.')
  if (state.board[index]) return fail(state, 'Giao điểm đã có quân.')
  const board = [...state.board], opponent = other(state.turn)
  board[index] = state.turn
  let captured = 0
  for (const adjacent of neighbors(index, state.size)) {
    if (board[adjacent] !== opponent) continue
    const group = getGroup(board, state.size, adjacent)
    if (!group.liberties.length) { captured += group.stones.length; group.stones.forEach(i => { board[i] = null }) }
  }
  if (!getGroup(board, state.size, index).liberties.length) return fail(state, 'Không được tự sát: nhóm quân phải còn khí sau khi bắt quân.')
  const position = keyOf(board)
  if (state.positions.includes(position)) return fail(state, 'Superko: không được lặp lại bất kỳ thế cờ đã xuất hiện trong ván.')
  return success(advance(state, { board, turn: opponent, passes: 0, captures: { ...state.captures, [state.turn]: state.captures[state.turn] + captured }, positions: [...state.positions, position], lastMove: { type: 'play', color: state.turn, index, captured } }))
}

export function pass(state) {
  if (state.phase !== 'play') return fail(state, 'Chỉ có thể bỏ lượt khi đang chơi.')
  const passes = state.passes + 1
  return success(advance(state, { turn: other(state.turn), passes, phase: passes === 2 ? 'scoring' : 'play', dead: [], agreements: { black: false, white: false }, lastMove: { type: 'pass', color: state.turn } }))
}

// Chinese area: remaining stones + single-color enclosed empty regions.
// Dead stones are removed before territory is computed; prisoners add no points.
export function scorePosition(state) {
  const board = state.board.map((stone, index) => state.dead.includes(index) ? null : stone)
  const area = { black: 0, white: 0 }, territory = { black: 0, white: 0 }, stones = { black: 0, white: 0 }
  const seen = new Set()
  let neutral = 0
  board.forEach((stone, start) => {
    if (stone) { stones[stone]++; area[stone]++; return }
    if (seen.has(start)) return
    const region = [start], queue = [start], borders = new Set()
    seen.add(start)
    while (queue.length) {
      for (const index of neighbors(queue.pop(), state.size)) {
        if (board[index]) borders.add(board[index])
        else if (!seen.has(index)) { seen.add(index); region.push(index); queue.push(index) }
      }
    }
    if (borders.size === 1) { const color = [...borders][0]; area[color] += region.length; territory[color] += region.length }
    else neutral += region.length
  })
  const totals = { black: area.black, white: area.white + state.komi }
  const difference = totals.black - totals.white
  return { area, territory, stones, neutral, komi: state.komi, totals, winner: difference === 0 ? 'draw' : difference > 0 ? BLACK : WHITE, margin: Math.abs(difference) }
}

export function toggleDeadGroup(state, index) {
  if (state.phase !== 'scoring') return fail(state, 'Chỉ đánh dấu quân chết trong giai đoạn tính điểm.')
  const group = getGroup(state.board, state.size, index)
  if (!group.stones.length) return fail(state, 'Chọn một nhóm quân để đánh dấu sống/chết.')
  const dead = new Set(state.dead), remove = dead.has(index)
  group.stones.forEach(i => remove ? dead.delete(i) : dead.add(i))
  return success(advance(state, { dead: [...dead].sort((a, b) => a - b), agreements: { black: false, white: false }, lastMove: { type: 'mark', index } }))
}

export function confirmScore(state, color) {
  if (state.phase !== 'scoring' || ![BLACK, WHITE].includes(color)) return fail(state, 'Xác nhận điểm không hợp lệ.')
  if (state.agreements[color]) return fail(state, 'Người chơi này đã xác nhận; thay đổi quân chết sẽ hủy xác nhận.')
  const agreements = { ...state.agreements, [color]: true }, finished = agreements.black && agreements.white
  const score = finished ? scorePosition(state) : null
  return success(advance(state, { agreements, phase: finished ? 'finished' : 'scoring', score, winner: score ? { color: score.winner, reason: 'score', margin: score.margin } : null, lastMove: { type: 'confirm', color } }))
}

export function resume(state) {
  if (state.phase !== 'scoring') return fail(state, 'Chỉ tiếp tục khi hai bên đang tính điểm.')
  return success(advance(state, { phase: 'play', passes: 0, dead: [], agreements: { black: false, white: false }, lastMove: { type: 'resume' } }))
}

export function resign(state, color = state.turn) {
  if (state.phase === 'finished' || ![BLACK, WHITE].includes(color)) return fail(state, 'Không thể đầu hàng trong trạng thái này.')
  return success(advance(state, { phase: 'finished', winner: { color: other(color), reason: 'resign' }, score: null, lastMove: { type: 'resign', color } }))
}

export function undo(state) {
  if (!state.past.length) return state
  return { ...structuredClone(state.past.at(-1)), past: state.past.slice(0, -1), future: [snapshot(state), ...state.future] }
}

export function redo(state) {
  if (!state.future.length) return state
  return { ...structuredClone(state.future[0]), past: [...state.past, snapshot(state)], future: state.future.slice(1) }
}
