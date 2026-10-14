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
