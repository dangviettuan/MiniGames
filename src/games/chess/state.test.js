import test from 'node:test'
import assert from 'node:assert/strict'
import { createStoredChess, validateStoredChess, encodeStoredChess, decodeStoredChess } from './state.js'
import { makeMove, resign, claimDraw } from '../../chess/engine.js'
const copy = x => JSON.parse(JSON.stringify(x))
const append = (saved,from,to,promotion) => {saved.timeline.push(makeMove(saved.timeline.at(-1),{from,to,promotion}));saved.cursor++}
test('save validation replays history, keeps redo and rejects corruption in rights / repetitions', () => {
  const saved=createStoredChess();append(saved,'e2','e4');append(saved,'e7','e5');saved.cursor=1;saved.flipped=true;saved.claimOnMove=true
  assert.equal(validateStoredChess(copy(saved)),true)
  for(const key of ['castling','positions','turn','board']) {const bad=copy(saved);bad.timeline[1][key]=null;assert.equal(validateStoredChess(bad),false)}
  for(const cursor of [-1,3,1.5]) assert.equal(validateStoredChess({...saved,cursor}),false)
  assert.equal(validateStoredChess(null),false)
})
test('validation preserves terminal mate and resignation snapshots', () => {
  const mate=createStoredChess();for(const [a,b] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]) append(mate,a,b)
  assert.equal(validateStoredChess(copy(mate)),true)
  const saved=createStoredChess();saved.timeline.push(resign(saved.timeline[0]));saved.cursor=1
  assert.equal(validateStoredChess(copy(saved)),true)
})
test('validation preserves claims and promotion capture history', () => {
  const saved=createStoredChess();for(let i=0;i<2;i++) for(const [a,b] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']]) append(saved,a,b)
  saved.timeline.push(claimDraw(saved.timeline.at(-1)));saved.cursor++
  assert.equal(validateStoredChess(copy(saved)),true)
  const promoted=createStoredChess();for(const [a,b] of [['a2','a4'],['h7','h5'],['a4','a5'],['h5','h4'],['a5','a6'],['h4','h3'],['a6','b7'],['h3','g2']]) append(promoted,a,b)
  append(promoted,'b7','a8','n');assert.equal(validateStoredChess(copy(promoted)),true)
})
test('compact save preserves repetition prefixes and reads legacy uncompressed saves', () => {
  const saved=createStoredChess();for(let i=0;i<2;i++) for(const [a,b] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']]) append(saved,a,b)
  saved.timeline.push(claimDraw(saved.timeline.at(-1)));saved.cursor=3
  const packed=encodeStoredChess(saved),restored=decodeStoredChess(copy(packed))
  assert.deepEqual(restored,saved);assert.equal(validateStoredChess(restored),true)
  assert.deepEqual(decodeStoredChess(saved),saved)
  assert.ok(JSON.stringify(packed).length<JSON.stringify(saved).length)
  const corrupt=copy(packed);corrupt.timeline[1].positions=-1;assert.throws(() => decodeStoredChess(corrupt))
})
