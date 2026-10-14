import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, play, pass, getGroup, scorePosition, toggleDeadGroup, confirmScore, resume, resign, undo, redo } from './engine.js'

function moves(coordinates, size = 9) {
  let state = createGame(size)
  for (const [row, col] of coordinates) {
    const result = play(state, row * size + col)
    assert.equal(result.ok, true, result.error)
    state = result.state
  }
  return state
}
function fixture(stones, turn = 'black') {
  const state = createGame()
  for (const [index, color] of stones) state.board[index] = color
  state.turn = turn
  state.positions = [state.board.map(v => v === 'black' ? 'b' : v === 'white' ? 'w' : '.').join('')]
  return state
}

test('supported boards, immutable moves, occupied and invalid coordinates', () => {
  for (const size of [9, 13, 19]) assert.equal(createGame(size).board.length, size * size)
  assert.throws(() => createGame(7))
  assert.throws(() => createGame(9, NaN))
  const original = createGame(), next = play(original, 0).state
  assert.equal(original.board[0], null)
  assert.equal(next.board[0], 'black')
  assert.equal(next.turn, 'white')
  for (const index of [0, -1, 81, 1.5, NaN]) assert.equal(play(next, index).ok, false)
})

test('corner capture removes stones, increases capturer total, and undo/redo restores capture', () => {
  const state = moves([[0, 1], [0, 0], [1, 0]])
  assert.equal(state.board[0], null)
  assert.equal(state.captures.black, 1)
  assert.equal(state.lastMove.captured, 1)
  const before = undo(state)
  assert.equal(before.board[0], 'white')
  assert.equal(before.captures.black, 0)
  assert.deepEqual(redo(before), state)
})

test('whole connected group captured once and diagonal stones do not share liberties', () => {
  // White A9/B9 have one remaining liberty at C9.
  const state = fixture([[0, 'white'], [1, 'white'], [9, 'black'], [10, 'black']])
  const result = play(state, 2)
  assert.equal(result.ok, true)
  assert.equal(result.state.captures.black, 2)
  assert.equal(result.state.board[0], null)
  assert.equal(result.state.board[1], null)
  const group = getGroup(state.board, 9, 9)
  assert.deepEqual(new Set(group.stones), new Set([9, 10]))
  const diagonal = fixture([[0, 'black'], [10, 'black']])
  assert.deepEqual(getGroup(diagonal.board, 9, 0).stones, [0])
})

test('suicide rejected without mutating history, capture at zero initial liberties allowed', () => {
  const state = fixture([[1, 'white'], [9, 'white']])
  const result = play(state, 0)
  assert.equal(result.ok, false)
  assert.match(result.error, /tự sát/)
  assert.equal(state.past.length, 0)
  const capture = fixture([[0, 'white'], [1, 'black'], [18, 'white'], [10, 'white']], 'black')
  const legal = play(capture, 9)
  assert.equal(legal.ok, true)
  assert.equal(legal.state.board[0], null)
})

test('positional superko rejects immediate recapture and recapture after passes/resume', () => {
  const before = moves([[0, 1], [0, 2], [1, 0], [2, 2], [2, 1], [1, 3], [8, 8], [1, 1]])
  const captured = play(before, 11).state
  assert.equal(captured.board[10], null)
  assert.match(play(captured, 10).error, /Superko/)
  const afterPasses = resume(pass(pass(captured).state).state).state
  assert.equal(afterPasses.turn, 'white')
  assert.match(play(afterPasses, 10).error, /Superko/)
  assert.equal(play(undo(captured), 79).ok, true)
})

test('two consecutive passes score, a placement resets passes, disagreement resumes correct turn', () => {
  let state = pass(createGame()).state
  assert.equal(state.passes, 1)
  state = play(state, 0).state
  assert.equal(state.passes, 0)
  state = pass(pass(state).state).state
  assert.equal(state.phase, 'scoring')
  assert.equal(state.turn, 'black')
  assert.equal(play(state, 1).ok, false)
  assert.equal(pass(state).ok, false)
  state = resume(state).state
  assert.equal(state.phase, 'play')
  assert.equal(state.turn, 'black')
  assert.equal(state.passes, 0)
})

test('Chinese scoring counts live stones and territory, shared regions neutral, komi only white', () => {
  const empty = scorePosition(createGame())
  assert.deepEqual(empty.totals, { black: 0, white: 7.5 })
  assert.equal(empty.neutral, 81)
  const one = scorePosition(play(createGame(), 0).state)
  assert.deepEqual(one.stones, { black: 1, white: 0 })
  assert.deepEqual(one.territory, { black: 80, white: 0 })
  assert.deepEqual(one.totals, { black: 81, white: 7.5 })
  const mixed = scorePosition(moves([[0, 0], [8, 8]]))
  assert.equal(mixed.neutral, 79)
  assert.deepEqual(mixed.totals, { black: 1, white: 8.5 })
  const enclosed = fixture([[1, 'black'], [9, 'black'], [80, 'white']])
  assert.equal(scorePosition(enclosed).territory.black, 1)
})

test('dead marking uses full groups, resets BOTH agreements, and requires mutual confirmation', () => {
  let state = pass(pass(moves([[0, 0], [8, 8], [0, 1]])).state).state
  assert.equal(toggleDeadGroup(state, 5).ok, false)
  state = confirmScore(state, 'black').state
  assert.equal(state.phase, 'scoring')
  assert.equal(confirmScore(state, 'black').ok, false)
  state = toggleDeadGroup(state, 0).state
  assert.deepEqual(state.dead, [0, 1])
  assert.deepEqual(state.agreements, { black: false, white: false })
  assert.equal(scorePosition(state).stones.black, 0)
  assert.equal(scorePosition(state).totals.white, 88.5)
  state = confirmScore(confirmScore(state, 'white').state, 'black').state
  assert.equal(state.phase, 'finished')
  assert.deepEqual(state.winner, { color: 'white', reason: 'score', margin: 88.5 })
  assert.equal(play(state, 5).ok, false)
  assert.equal(resign(state).ok, false)
  const beforeFinal = undo(state)
  assert.equal(beforeFinal.phase, 'scoring')
  assert.equal(beforeFinal.winner, null)
  assert.deepEqual(redo(beforeFinal), state)
})

test('removing marks, resume and history branching restore all scoring state', () => {
  let state = pass(pass(moves([[0, 0], [8, 8]])).state).state
  state = toggleDeadGroup(state, 0).state
  state = confirmScore(state, 'black').state
  const unmark = toggleDeadGroup(state, 0).state
  assert.deepEqual(unmark.dead, [])
  assert.deepEqual(unmark.agreements, { black: false, white: false })
  const continued = resume(state).state
  assert.deepEqual(continued.dead, [])
  assert.deepEqual(continued.agreements, { black: false, white: false })
  assert.deepEqual(redo(undo(continued)), continued)
  const branched = resume(undo(unmark)).state
  assert.equal(branched.future.length, 0)
  assert.deepEqual(redo(branched), branched)
})

test('resignation gives opponent win and can undo/redo, no moves after finished', () => {
  const before = play(createGame(), 0).state
  const state = resign(before).state
  assert.deepEqual(state.winner, { color: 'black', reason: 'resign' })
  assert.equal(state.phase, 'finished')
  assert.deepEqual(undo(state).board, before.board)
  assert.deepEqual(redo(undo(state)), state)
  assert.equal(confirmScore(state, 'black').ok, false)
  assert.equal(toggleDeadGroup(state, 0).ok, false)
})
