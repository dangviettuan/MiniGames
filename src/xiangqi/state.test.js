import test from 'node:test'
import assert from 'node:assert/strict'
import { initialGame, validStoredGame, position } from './state.js'
import { playMove } from './engine.js'
function apply(game,from,to){const result=playMove(game.board,game.turn,from,to);return {...game,...result,timeline:[...game.timeline,{before:position(game),after:result,from,to,description:'Move'}],cursor:game.cursor+1}}
test('saved Xiangqi replays valid history and restores an undone cursor with orientation',()=>{
 let game=apply(initialGame(),[6,0],[5,0]);game=apply(game,[3,0],[4,0])
 game={...game,...game.timeline[1].before,cursor:1,flipped:true,coordinates:true}
 assert.equal(validStoredGame(JSON.parse(JSON.stringify(game))),true)
})
test('Xiangqi storage rejects fabricated wins, board corruption and invalid timeline transitions',()=>{
 const game=apply(initialGame(),[6,0],[5,0])
 for(const mutate of [g=>g.winner='red',g=>g.board[0][0]=null,g=>g.cursor=4,g=>g.timeline[0].to=[9,9],g=>g.timeline[0].after.turn='red',g=>delete g.flipped]){
  const broken=structuredClone(game);mutate(broken);assert.equal(validStoredGame(broken),false)
 }
 assert.equal(validStoredGame(null),false)
 assert.equal(validStoredGame(initialGame()),true)
})
