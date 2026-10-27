import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, play, pass, confirmScore, toggleDeadGroup, undo, redo } from '../../go/engine.js'
import { encodeGo, decodeGo, validateSavedGo } from './storage.js'

const apply = (state, index) => { const result = play(state, index); assert.equal(result.ok, true, result.error); return result.state }
test('300-move 19x19 save stays below 1MB and restores exact repetition/history state', () => {
  let state = createGame(19), count = 0
  for (let attempt = 0; count < 300 && attempt < 3610; attempt++) {
    const result = play(state, attempt % 361)
    if (result.ok) { state = result.state; count++ }
  }
  assert.equal(count, 300)
  state = undo(undo(state))
  const encoded = JSON.stringify(encodeGo(state))
  assert.ok(Buffer.byteLength(encoded) < 1_000_000, `Encoded payload ${Buffer.byteLength(encoded)} bytes`)
  const restored = decodeGo(JSON.parse(encoded))
  assert.equal(validateSavedGo(restored), true)
  assert.deepEqual(restored, state)
  assert.deepEqual(redo(redo(restored)), redo(redo(state)))
})

test('scoring marks, agreements and completed outcome survive compact save', () => {
  let state = apply(createGame(), 0)
  state = pass(pass(state).state).state
  state = toggleDeadGroup(state, 0).state
  state = confirmScore(state, 'black').state
  const restored = decodeGo(JSON.parse(JSON.stringify(encodeGo(state))))
  assert.equal(validateSavedGo(restored), true)
  assert.deepEqual(restored, state)
  const finished = confirmScore(restored, 'white').state
  assert.equal(validateSavedGo(finished), true)
  assert.deepEqual(decodeGo(encodeGo(finished)), finished)
})

test('ko rejection survives compression and undo/redo', () => {
  let state = createGame()
  for (const [row, col] of [[0, 1], [0, 2], [1, 0], [2, 2], [2, 1], [1, 3], [8, 8], [1, 1], [1, 2]]) state = apply(state, row * 9 + col)
  const restored = decodeGo(encodeGo(undo(state)))
  const captured = redo(restored)
  assert.equal(play(captured, 10).ok, false)
  assert.match(play(captured, 10).error, /Superko/)
})

test('legacy saves load, malformed current/history/scoring records are rejected', () => {
  const initial = createGame()
  assert.deepEqual(decodeGo(initial), initial)
  assert.equal(validateSavedGo({ ...initial, board: [] }), false)
  assert.equal(validateSavedGo({ ...initial, past: [{ ...initial, positions: ['bad'] }] }), false)
  assert.equal(validateSavedGo({ ...initial, phase: 'finished', winner: { reason: 'resign', color: 'white' }, score: {} }), false)
  const bad = encodeGo(initial)
  bad.game.positions = [999]
  assert.throws(() => decodeGo(bad), /reference/)
})
