import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadGame,saveGame,storageKey} from './storage.js'
const valid = x => !!x && Number.isInteger(x.cursor) && Array.isArray(x.history)
const initial = () => ({cursor:0,history:[]})
test('saved history restores exact branch and terminal data',()=>{const map=new Map();const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};const state={cursor:1,history:[{winner:null},{winner:'white'}]};assert.equal(saveGame(storage,'chess',state),true);assert.deepEqual(loadGame(storage,'chess',initial,valid),state)})
test('malformed, old-version and invalid schemas fall back to a safe fresh game',()=>{for(const raw of ['{',JSON.stringify({version:0,data:{cursor:1,history:[]}}),JSON.stringify({version:1,data:{cursor:'bad'}}),'null'])assert.deepEqual(loadGame({getItem:()=>raw},'go',initial,valid),initial())})
test('blocked or full storage never prevents play and write failure is observable',()=>{const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('quota')}};assert.deepEqual(loadGame(blocked,'go',initial,valid),initial());assert.equal(saveGame(blocked,'go',initial()),false);assert.equal(saveGame(null,'go',initial()),false);assert.notEqual(storageKey('go'),storageKey('chess'))})

test('game codecs restore validated state and decoding failures cannot break hydration',()=>{const map=new Map();const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};const codec={encode:state=>[state.cursor,state.history],decode:packed=>({cursor:packed[0],history:packed[1]})};const state={cursor:1,history:['start','won']};assert.equal(saveGame(storage,'go',state,codec),true);assert.deepEqual(loadGame(storage,'go',initial,valid,codec),state);assert.deepEqual(loadGame(storage,'go',initial,valid,{decode(){throw Error('invalid pack')}}),initial());assert.equal(saveGame(storage,'go',state,{encode(){throw Error('bad')}}),false)})
