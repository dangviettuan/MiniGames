import { initBoard, playMove, RED } from './engine.js'

export function initialGame() {
  return { board: initBoard(), turn: RED, winner: null, reason: null, timeline: [], cursor: 0, flipped: false, coordinates: false }
}
export const position = game => ({ board: game.board, turn: game.turn, winner: game.winner, reason: game.reason })
const samePosition = (a,b) => !!a && !!b && a.turn===b.turn && a.winner===b.winner && a.reason===b.reason && JSON.stringify(a.board)===JSON.stringify(b.board)
const square = value => Array.isArray(value) && value.length===2 && Number.isInteger(value[0]) && Number.isInteger(value[1]) && value[0]>=0 && value[0]<10 && value[1]>=0 && value[1]<9

// Replay saved moves rather than trusting arbitrary boards, winners or snapshots.
export function validStoredGame(game) {
  if (!game || typeof game.flipped!=='boolean' || typeof game.coordinates!=='boolean' || !Array.isArray(game.timeline) || game.timeline.length>2000 || !Number.isInteger(game.cursor) || game.cursor<0 || game.cursor>game.timeline.length) return false
  let current=position(initialGame()), restored=current
  for(let i=0;i<game.timeline.length;i++) {
    const entry=game.timeline[i]
    if (!entry || !square(entry.from) || !square(entry.to) || typeof entry.description!=='string' || !samePosition(entry.before,current) || current.winner) return false
    const next=playMove(current.board,current.turn,entry.from,entry.to)
    if (!next || !samePosition(entry.after,next)) return false
    current=next
    if(i+1===game.cursor) restored=current
  }
  return samePosition(game,restored)
}
