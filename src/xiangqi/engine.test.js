import test from 'node:test'
import assert from 'node:assert/strict'
import { initBoard, rawValid, legal, inCheck, findGeneral, mk, anyMove } from './engine.js'

const empty = () => Array.from({ length: 10 }, () => Array(9).fill(null))
test('initial setup has 32 pieces and both generals', () => {
 const b=initBoard(); assert.equal(b.flat().filter(Boolean).length,32)
 assert.deepEqual(findGeneral(b,'red'),[9,4]); assert.deepEqual(findGeneral(b,'black'),[0,4])
})
test('soldier cannot move sideways before river', () => {
 const b=initBoard(); assert.equal(rawValid(b,[6,0],[6,1]),false); assert.equal(legal(b,[6,0],[5,0]),true)
})
test('horse leg and elephant eye can be blocked', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][3]=mk('general','black','bg')
 b[5][4]=mk('horse','red','h'); b[6][4]=mk('soldier','red','s')
 assert.equal(rawValid(b,[5,4],[7,5]),false)
 b[5][4]=mk('elephant','red','e'); b[6][5]=mk('soldier','red','s2')
 assert.equal(rawValid(b,[5,4],[7,6]),false)
})
test('cannon captures only over exactly one screen', () => {
 const b=empty(); b[7][1]=mk('cannon','red','c'); b[4][1]=mk('rook','black','r')
 assert.equal(rawValid(b,[7,1],[4,1]),false)
 b[6][1]=mk('soldier','red','s')
 assert.equal(rawValid(b,[7,1],[4,1]),true)
 b[5][1]=mk('soldier','black','s2')
 assert.equal(rawValid(b,[7,1],[4,1]),false)
})
test('flying general capture is legal only on clear file', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][4]=mk('general','black','bg')
 assert.equal(legal(b,[9,4],[0,4]),true)
 b[5][4]=mk('soldier','red','s'); assert.equal(legal(b,[9,4],[0,4]),false)
})
test('cannot expose own general to facing generals', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][4]=mk('general','black','bg'); b[5][4]=mk('rook','red','r')
 assert.equal(legal(b,[5,4],[5,3]),false); assert.equal(inCheck(b,'red'),false)
})
test('cannot move into check', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][3]=mk('general','black','bg'); b[5][5]=mk('rook','black','r')
 assert.equal(legal(b,[9,4],[9,5]),false)
})
test('both sides have opening moves', () => {
 const b=initBoard(); assert.equal(anyMove(b,'red'),true); assert.equal(anyMove(b,'black'),true)
})

test('soldiers cross the river but never move backwards', () => {
 const b=empty(); b[4][4]=mk('soldier','red','r'); b[5][6]=mk('soldier','black','b')
 for (const [from, to] of [[[4,4],[4,3]], [[4,4],[3,4]], [[5,6],[5,7]], [[5,6],[6,6]]]) assert.equal(rawValid(b,from,to),true)
 assert.equal(rawValid(b,[4,4],[5,4]),false); assert.equal(rawValid(b,[5,6],[4,6]),false)
})
test('advisors and generals stay in the palace, elephants stay on their side', () => {
 const b=empty(); b[7][3]=mk('advisor','red','a'); b[7][4]=mk('general','red','g'); b[5][4]=mk('elephant','red','e')
 assert.equal(rawValid(b,[7,3],[6,2]),false); assert.equal(rawValid(b,[7,3],[8,4]),true)
 assert.equal(rawValid(b,[7,4],[6,4]),false); assert.equal(rawValid(b,[5,4],[3,2]),false)
 assert.equal(rawValid(b,[5,4],[7,6]),true)
})
test('a pinned piece cannot uncover a rook attack on its own general', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][3]=mk('general','black','bg')
 b[5][4]=mk('rook','black','br'); b[7][4]=mk('rook','red','rr')
 assert.equal(rawValid(b,[7,4],[7,5]),true); assert.equal(legal(b,[7,4],[7,5]),false)
 assert.equal(legal(b,[7,4],[5,4]),true)
})

import { playMove, positionResult, legalMoves, between } from './engine.js'
test('opening has 44 legal moves for each side', () => {
 const b=initBoard()
 for (const side of ['red','black']) {
  let count=0
  b.forEach((row,r)=>row.forEach((p,c)=>{ if(p?.side===side) count+=legalMoves(b,[r,c]).length }))
  assert.equal(count,44)
 }
})
test('engine validates turn, rejects illegal moves and does not mutate input', () => {
 const b=initBoard(), original=structuredClone(b)
 assert.equal(playMove(b,'red',[3,0],[4,0]),null)
 assert.equal(playMove(b,'red',[6,0],[6,1]),null)
 const next=playMove(b,'red',[6,0],[5,0])
 assert.equal(next.turn,'black'); assert.equal(next.winner,null); assert.equal(next.reason,null)
 assert.equal(next.board[5][0].id,'rs1'); assert.equal(next.board[6][0],null)
 assert.deepEqual(b,original)
 next.board[5][0].id='changed'; assert.equal(b[6][0].id,'rs1')
})
test('checkmate resolves a win and does not require capturing the general', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][4]=mk('general','black','bg')
 b[5][4]=mk('soldier','red','s'); b[1][3]=mk('rook','red','r1'); b[1][5]=mk('rook','red','r2'); b[2][0]=mk('rook','red','r3')
 assert.equal(inCheck(b,'black'),false)
 const next=playMove(b,'red',[2,0],[0,0])
 assert.equal(next.winner,'red'); assert.equal(next.reason,'checkmate')
 assert.deepEqual(findGeneral(next.board,'black'),[0,4]); assert.equal(anyMove(next.board,'black'),false)
})
test('stalemate is a loss in Xiangqi even without check', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][4]=mk('general','black','bg')
 b[5][4]=mk('soldier','red','s'); b[1][3]=mk('rook','red','r1'); b[1][5]=mk('rook','red','r2')
 assert.equal(inCheck(b,'black'),false); assert.equal(anyMove(b,'black'),false)
 assert.deepEqual(positionResult(b,'black'),{winner:'red',reason:'stalemate'})
})
test('general capture ends the game and further moves are rejected', () => {
 const b=empty(); b[9][4]=mk('general','red','rg'); b[0][4]=mk('general','black','bg')
 const next=playMove(b,'red',[9,4],[0,4])
 assert.equal(next.winner,'red'); assert.equal(next.reason,'capture')
 assert.equal(playMove(next.board,'red',[0,4],[1,4]),null)
})
test('between handles identical endpoints without looping', () => {
 assert.equal(between(initBoard(),[0,0],[0,0]),-1)
 assert.equal(between(initBoard(),[-1,0],[0,0]),-1)
})
