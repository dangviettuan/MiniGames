// Pure, immutable chess rules. Board indices run a8 (0) to h1 (63).
export const square = name => (8 - Number(name[1])) * 8 + name.charCodeAt(0) - 97
export const algebraic = index => 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8))
export const color = piece => piece ? (piece === piece.toUpperCase() ? 'w' : 'b') : null
const other = side => side === 'w' ? 'b' : 'w'
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8
const knight = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]

export function fromFEN(fen) {
  const [placement, turn = 'w', castling = '-', ep = '-', halfmove = '0', fullmove = '1'] = fen.split(' ')
  const board = []
  for (const ch of placement.replaceAll('/', '')) {
    if (/\d/.test(ch)) board.push(...Array(Number(ch)).fill(null))
    else board.push(ch)
  }
  if (board.length !== 64 || !['w','b'].includes(turn) || board.filter(p => p === 'K').length !== 1 || board.filter(p => p === 'k').length !== 1) throw new Error('Invalid chess position')
  const state = { board, turn, castling: castling === '-' ? '' : castling, ep: ep === '-' ? null : square(ep), halfmove: Number(halfmove), fullmove: Number(fullmove), positions: [], result: null, lastMove: null }
  state.positions = [positionKey(state)]
  return state
}
export const initialState = () => fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

export function isAttacked(state, target, by) {
  const row = Math.floor(target / 8), col = target % 8
  const pawnRow = row + (by === 'w' ? 1 : -1)
  for (const dc of [-1,1]) if (inside(pawnRow,col+dc) && state.board[pawnRow*8+col+dc] === (by === 'w' ? 'P' : 'p')) return true
  for (const [dr,dc] of knight) if (inside(row+dr,col+dc) && state.board[(row+dr)*8+col+dc] === (by === 'w' ? 'N' : 'n')) return true
  for (let d = 0; d < directions.length; d++) {
    const [dr,dc] = directions[d]
    for (let n = 1; inside(row+dr*n,col+dc*n); n++) {
      const p = state.board[(row+dr*n)*8+col+dc*n]
      if (!p) continue
      if (color(p) === by && (p.toLowerCase() === 'q' || p.toLowerCase() === (d < 4 ? 'r' : 'b') || (n === 1 && p.toLowerCase() === 'k'))) return true
      break
    }
  }
  return false
}
export function inCheck(state, side = state.turn) {
  const king = state.board.indexOf(side === 'w' ? 'K' : 'k')
  return king < 0 || isAttacked(state, king, other(side))
}

function pseudoMoves(state, from) {
  const piece = state.board[from], side = color(piece), moves = []
  if (side !== state.turn) return moves
  const row = Math.floor(from / 8), col = from % 8, type = piece.toLowerCase()
  const add = (to, extra = {}) => {
    if (color(state.board[to]) === side || state.board[to]?.toLowerCase() === 'k') return
    if (type === 'p' && [0,7].includes(Math.floor(to / 8))) for (const promotion of ['q','r','b','n']) moves.push({ from, to, promotion, ...extra })
    else moves.push({ from, to, ...extra })
  }
  if (type === 'p') {
    const dr = side === 'w' ? -1 : 1, next = from + dr * 8
    if (inside(row+dr,col) && !state.board[next]) {
      add(next)
      if (row === (side === 'w' ? 6 : 1) && !state.board[next + dr*8]) add(next + dr*8)
    }
    for (const dc of [-1,1]) if (inside(row+dr,col+dc)) {
      const to = (row+dr)*8+col+dc
      if (state.board[to] && color(state.board[to]) === other(side)) add(to)
      else if (to === state.ep && !state.board[to] && state.board[to-dr*8] === (side === 'w' ? 'p' : 'P')) add(to,{ enPassant: true })
    }
  } else if (type === 'n' || type === 'k') {
    for (const [dr,dc] of type === 'n' ? knight : directions) if (inside(row+dr,col+dc)) add((row+dr)*8+col+dc)
    if (type === 'k') {
      const home = side === 'w' ? 60 : 4
      if (from === home && !inCheck(state,side)) for (const kingSide of [true,false]) {
        const right = side === 'w' ? (kingSide ? 'K':'Q') : (kingSide ? 'k':'q')
        const rook = home + (kingSide ? 3 : -4), step = kingSide ? 1 : -1
        if (!state.castling.includes(right) || state.board[rook] !== (side === 'w' ? 'R':'r')) continue
        if (Array.from({length: kingSide ? 2 : 3}, (_,i) => home+step*(i+1)).some(i => state.board[i])) continue
        // Attack checks must use the intermediate king position, with its old square empty.
        const transit = { ...state, board: [...state.board] }
        transit.board[home] = null; transit.board[home+step] = piece
        if (!isAttacked(transit,home+step,other(side))) add(home+step*2,{ castle: kingSide ? 'king':'queen' })
      }
    }
  } else {
    const dirs = type === 'b' ? directions.slice(4) : type === 'r' ? directions.slice(0,4) : directions
    for (const [dr,dc] of dirs) for (let n=1; inside(row+dr*n,col+dc*n); n++) {
      const to = (row+dr*n)*8+col+dc*n
      add(to)
      if (state.board[to]) break
    }
  }
  return moves
}

function applyRaw(state, move) {
  const board = [...state.board], piece = board[move.from], captured = board[move.to], side = color(piece)
  board[move.from] = null
  board[move.to] = move.promotion ? (side === 'w' ? move.promotion.toUpperCase() : move.promotion) : piece
  if (move.enPassant) board[move.to + (side === 'w' ? 8 : -8)] = null
  if (move.castle) {
    const rookFrom = move.from + (move.castle === 'king' ? 3 : -4), rookTo = move.from + (move.castle === 'king' ? 1 : -1)
    board[rookTo] = board[rookFrom]; board[rookFrom] = null
  }
  let castling = state.castling
  if (piece === 'K') castling = castling.replace(/[KQ]/g,'')
  if (piece === 'k') castling = castling.replace(/[kq]/g,'')
  for (const [i,right] of [[0,'q'],[7,'k'],[56,'Q'],[63,'K']]) if (move.from === i || move.to === i) castling = castling.replace(right,'')
  return { ...state, board, turn: other(side), castling, ep: piece.toLowerCase() === 'p' && Math.abs(move.to-move.from) === 16 ? (move.from+move.to)/2 : null, halfmove: piece.toLowerCase() === 'p' || captured || move.enPassant ? 0 : state.halfmove+1, fullmove: state.fullmove + (side === 'b' ? 1 : 0), lastMove: move, result: null }
}
export function legalMoves(state, from = null) {
  if (state.result) return []
  const result = []
  for (let i = 0; i < 64; i++) if ((from === null || from === i) && color(state.board[i]) === state.turn) {
    for (const move of pseudoMoves(state,i)) if (!inCheck(applyRaw(state,move),state.turn)) result.push(move)
  }
  return result
}
export function positionKey(state) {
  // A non-capturable en passant target does not distinguish repetition positions.
  const ep = state.ep !== null && legalMoves({ ...state, result: null }).some(m => m.enPassant) ? state.ep : '-'
  return state.board.map(p => p || '.').join('') + ':' + state.turn + ':' + state.castling + ':' + ep
}
export function insufficientMaterial(state) {
  const pieces = state.board.map((p,i) => ({p: p?.toLowerCase(),i})).filter(x => x.p && x.p !== 'k')
  if (!pieces.length) return true
  if (pieces.length === 1 && ['b','n'].includes(pieces[0].p)) return true
  return pieces.every(x => x.p === 'b') && new Set(pieces.map(x => (Math.floor(x.i/8)+x.i%8)%2)).size === 1
}
export function outcome(state) {
  if (state.result) return state.result
  if (!legalMoves(state).length) return inCheck(state) ? { winner: other(state.turn), reason: 'checkmate' } : { winner: null, reason: 'stalemate' }
  if (insufficientMaterial(state)) return { winner: null, reason: 'insufficient-material' }
  if (state.halfmove >= 150) return { winner: null, reason: 'seventy-five-move' }
  const key = positionKey(state)
  if (state.positions.filter(p => p === key).length >= 5) return { winner: null, reason: 'fivefold-repetition' }
  return null
}
export function drawClaims(state) {
  if (outcome(state)) return []
  const claims = []
  if (state.halfmove >= 100) claims.push('fifty-move')
  const key = positionKey(state)
  if (state.positions.filter(p => p === key).length >= 3) claims.push('repetition')
  return claims
}
export function claimDraw(state, reason = drawClaims(state)[0]) {
  if (!drawClaims(state).includes(reason)) throw new Error('Chưa đủ điều kiện yêu cầu hòa')
  return { ...state, result: { winner: null, reason } }
}
export function makeMoveAndClaim(state, input) {
  const next = makeMove(state,input)
  // Supports claiming on an announced move, before the opponent gets the turn.
  return drawClaims(next).length ? claimDraw(next) : next
}
export function makeMove(state, input) {
  if (outcome(state)) throw new Error('Ván cờ đã kết thúc')
  const from = typeof input.from === 'string' ? square(input.from) : input.from, to = typeof input.to === 'string' ? square(input.to) : input.to
  const move = legalMoves(state,from).find(m => m.to === to && (m.promotion || null) === (input.promotion?.toLowerCase() || null))
  if (!move) throw new Error('Nước đi không hợp lệ')
  const next = applyRaw(state,move)
  next.positions = [...state.positions,positionKey(next)]
  next.result = outcome(next)
  return next
}
export function resign(state) {
  if (outcome(state)) throw new Error('Ván cờ đã kết thúc')
  const opponent = other(state.turn)
  // A bare king can never checkmate, even with the resigning player's help.
  // Do not attempt arbitrary cooperative-mate/dead-position proofs here.
  const opponentHasPiece = state.board.some(p => color(p) === opponent && p.toLowerCase() !== 'k')
  return { ...state, result: opponentHasPiece
    ? { winner: opponent, reason: 'resignation' }
    : { winner: null, reason: 'resignation-no-mating-material' } }
}
