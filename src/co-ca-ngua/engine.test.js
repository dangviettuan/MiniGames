import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, rollDice, moveHorse, legalMoves, destination, undo, redo, trackSquare } from './engine.js'
const rolled = (die, options) => rollDice(createGame(options), () => (die - 0.5) / 6)
const position = (horses, die = 1, options) => ({ ...createGame(options), horses, phase: 'move', die })
const empty = () => Array.from({ length: 4 }, () => [-1, -1, -1, -1])
test('2/3/4 players, opposite seats for two, invalid setup', () => {
  assert.deepEqual(createGame().seats, [0, 2])
  assert.equal(createGame({ players: 3 }).seats.length, 3)
  assert.equal(createGame({ players: 4 }).seats.length, 4)
  assert.throws(() => createGame({ players: 1 }))
  assert.throws(() => createGame({ startRule: 'anything' }))
})
test('1 or 6 leaves stable, six-only option, no moves auto advances', () => {
  assert.equal(legalMoves(rolled(1)).length, 4)
  assert.equal(legalMoves(rolled(6)).length, 4)
  const blocked = rolled(1, { startRule: 'six' })
  assert.equal(blocked.current, 1)
  assert.equal(blocked.phase, 'roll')
  assert.match(blocked.message, /không có nước/)
  assert.equal(rolled(3).current, 1)
})
test('cannot reroll before choosing, six gets extra turn, other dice advance', () => {
  const state = rolled(6)
  assert.equal(rollDice(state), state)
  assert.equal(moveHorse(state, 0).current, 0)
  assert.equal(moveHorse(rolled(1), 0).current, 1)
  assert.equal(moveHorse(state, 99), state)
})
test('landing enemy captures; no safe squares including start', () => {
  const h = empty(); h[0][0] = 10; h[2][0] = 39 // both target square 11
  const moved = moveHorse(position(h), 0)
  assert.equal(moved.horses[2][0], -1)
  assert.equal(moved.horses[0][0], 11)
  const s = empty(); s[2][0] = 28
  const exit = moveHorse(position(s, 6), 0)
  assert.equal(exit.horses[2][0], -1)
})
test('cannot jump enemies or own horses or land on own horse', () => {
  const h = empty(); h[0][0] = 10; h[2][0] = 39
  assert.equal(destination(position(h, 2), 0), null)
  h[2][0] = -1; h[0][1] = 11
  assert.equal(destination(position(h, 2), 0), null)
  assert.equal(destination(position(h, 1), 0), null)
  h[0] = [0, -1, -1, -1]
  assert.equal(destination(position(h, 6), 1), null)
})
test('track wraps and home entry belongs to own route after full lap', () => {
  assert.equal(trackSquare(2, 28), 0)
  const h = empty(); h[0][0] = 55
  assert.equal(destination(position(h, 1), 0), 56)
  assert.equal(destination(position(h, 6), 0), 61)
})
test('exact home movement; no jumping or landing on home occupants', () => {
  const h = empty(); h[0] = [55, 57, -1, -1]
  assert.equal(destination(position(h, 3), 0), null)
  assert.equal(destination(position(h, 2), 0), null)
  h[0] = [60, -1, -1, -1]
  assert.equal(destination(position(h, 2), 0), null)
  assert.equal(destination(position(h, 1), 0), 61)
})
test('win requires all four horses at slots 3/4/5/6, stops actions, undo/redo winner', () => {
  const h = empty(); h[0] = [57, 59, 60, 61]
  const state = position(h), won = moveHorse(state, 0)
  assert.equal(won.winner, 0)
  assert.equal(won.phase, 'finished')
  assert.equal(rollDice(won), won)
  assert.equal(moveHorse(won, 1), won)
  assert.equal(undo(won).winner, null)
  assert.equal(redo(undo(won)).winner, 0)
})
test('undo/redo preserves dice, undo roll cannot fish new RNG, branching keeps tape', () => {
  const start = createGame(), six = rollDice(start, () => 0.99), moved = moveHorse(six, 0)
  assert.equal(undo(moved).die, 6)
  assert.deepEqual(redo(undo(moved)).horses, moved.horses)
  const previous = undo(undo(moved))
  const replayed = rollDice(previous, () => { throw new Error('must replay die') })
  assert.equal(replayed.die, 6)
  const branch = moveHorse(replayed, 1)
  assert.equal(branch.future.length, 0)
  assert.equal(branch.horses[0][1], 0)
  assert.equal(branch.horses[0][0], -1)
  assert.equal(undo(start), start)
  assert.equal(redo(start), start)
})
test('blocked six retains bonus turn; invalid RNG is refused', () => {
  const h = empty(); h[0] = [61, 60, 59, 58]
  const state = rollDice({ ...createGame(), horses: h }, () => 0.99)
  assert.equal(state.current, 0)
  assert.equal(state.phase, 'roll')
  assert.throws(() => rollDice(createGame(), () => 1))
  assert.throws(() => rollDice(createGame(), () => -1))
})
