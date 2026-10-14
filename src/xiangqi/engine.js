export const COLS = 9
export const ROWS = 10
export const RED = 'red'
export const BLACK = 'black'

export const TXT = {
  red: { general: '帥', advisor: '仕', elephant: '相', horse: '馬', rook: '車', cannon: '炮', soldier: '兵' },
  black: { general: '將', advisor: '士', elephant: '象', horse: '馬', rook: '車', cannon: '砲', soldier: '卒' },
}

export const NAMES = { red: 'Đỏ', black: 'Đen' }

export function mk(type, side, id) { return { type, side, id } }
export function inside(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS }
export function clone(board) { return board.map(row => row.map(cell => (cell ? { ...cell } : null))) }
export function enemy(side) { return side === RED ? BLACK : RED }
export function label(piece) { return piece ? TXT[piece.side][piece.type] : '' }

export function initBoard() {
  const b = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  b[0][0] = mk('rook', BLACK, 'br1'); b[0][1] = mk('horse', BLACK, 'bh1'); b[0][2] = mk('elephant', BLACK, 'be1'); b[0][3] = mk('advisor', BLACK, 'ba1'); b[0][4] = mk('general', BLACK, 'bg'); b[0][5] = mk('advisor', BLACK, 'ba2'); b[0][6] = mk('elephant', BLACK, 'be2'); b[0][7] = mk('horse', BLACK, 'bh2'); b[0][8] = mk('rook', BLACK, 'br2')
  b[2][1] = mk('cannon', BLACK, 'bc1'); b[2][7] = mk('cannon', BLACK, 'bc2')
  b[3][0] = mk('soldier', BLACK, 'bs1'); b[3][2] = mk('soldier', BLACK, 'bs2'); b[3][4] = mk('soldier', BLACK, 'bs3'); b[3][6] = mk('soldier', BLACK, 'bs4'); b[3][8] = mk('soldier', BLACK, 'bs5')

  b[9][0] = mk('rook', RED, 'rr1'); b[9][1] = mk('horse', RED, 'rh1'); b[9][2] = mk('elephant', RED, 're1'); b[9][3] = mk('advisor', RED, 'ra1'); b[9][4] = mk('general', RED, 'rg'); b[9][5] = mk('advisor', RED, 'ra2'); b[9][6] = mk('elephant', RED, 're2'); b[9][7] = mk('horse', RED, 'rh2'); b[9][8] = mk('rook', RED, 'rr2')
  b[7][1] = mk('cannon', RED, 'rc1'); b[7][7] = mk('cannon', RED, 'rc2')
  b[6][0] = mk('soldier', RED, 'rs1'); b[6][2] = mk('soldier', RED, 'rs2'); b[6][4] = mk('soldier', RED, 'rs3'); b[6][6] = mk('soldier', RED, 'rs4'); b[6][8] = mk('soldier', RED, 'rs5')
  return b
}

export function palace(side, r, c) {
  return side === BLACK ? r >= 0 && r <= 2 && c >= 3 && c <= 5 : r >= 7 && r <= 9 && c >= 3 && c <= 5
}
export function crossed(side, r) { return side === RED ? r <= 4 : r >= 5 }

export function between(board, from, to) {
  const [fr, fc] = from
  const [tr, tc] = to
  if (!inside(fr, fc) || !inside(tr, tc) || (fr === tr && fc === tc)) return -1
  let n = 0
  if (fr === tr) {
    const step = tc > fc ? 1 : -1
    for (let c = fc + step; c !== tc; c += step) if (board[fr][c]) n++
    return n
  }
  if (fc === tc) {
    const step = tr > fr ? 1 : -1
    for (let r = fr + step; r !== tr; r += step) if (board[r][fc]) n++
    return n
  }
  return -1
}

export function findGeneral(board, side) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.type === 'general' && board[r][c]?.side === side) return [r, c]
    }
  }
  return null
}

export function facing(board) {
  const r = findGeneral(board, RED)
  const b = findGeneral(board, BLACK)
  if (!r || !b || r[1] !== b[1]) return false
  return between(board, r, b) === 0
}

export function rawValid(board, from, to) {
  const [fr, fc] = from
  const [tr, tc] = to
  if (!inside(fr, fc) || !inside(tr, tc) || (fr === tr && fc === tc)) return false
  const p = board[fr][fc]
  const t = board[tr][tc]
  if (!p) return false
  if (t && t.side === p.side) return false
  const dr = tr - fr
  const dc = tc - fc
  const adr = Math.abs(dr)
  const adc = Math.abs(dc)

  switch (p.type) {
    case 'general':
      return (palace(p.side, tr, tc) && adr + adc === 1) || (t?.type === 'general' && t.side !== p.side && fc === tc && between(board, from, to) === 0)
    case 'advisor':
      return palace(p.side, tr, tc) && adr === 1 && adc === 1
    case 'elephant': {
      if (adr !== 2 || adc !== 2) return false
      if (p.side === RED && tr <= 4) return false
      if (p.side === BLACK && tr >= 5) return false
      return !board[fr + dr / 2][fc + dc / 2]
    }
    case 'horse':
      if (!((adr === 2 && adc === 1) || (adr === 1 && adc === 2))) return false
      return adr === 2 ? !board[fr + dr / 2][fc] : !board[fr][fc + dc / 2]
    case 'rook':
      return (fr === tr || fc === tc) && between(board, from, to) === 0
    case 'cannon': {
      if (!(fr === tr || fc === tc)) return false
      const blocks = between(board, from, to)
      return t ? blocks === 1 : blocks === 0
    }
    case 'soldier': {
      const fwd = p.side === RED ? -1 : 1
      if (!crossed(p.side, fr)) return dc === 0 && dr === fwd
      return (dc === 0 && dr === fwd) || (dr === 0 && adc === 1)
    }
    default:
      return false
  }
}

export function inCheck(board, side) {
  const g = findGeneral(board, side)
  if (!g) return true
  if (facing(board)) return true
  const foe = enemy(side)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.side === foe && rawValid(board, [r, c], g)) return true
    }
  }
  return false
}

export function legal(board, from, to) {
  if (!rawValid(board, from, to)) return false
  const next = clone(board)
  next[to[0]][to[1]] = next[from[0]][from[1]]
  next[from[0]][from[1]] = null
  const mover = next[to[0]][to[1]].side
  if (facing(next)) return false
  if (inCheck(next, mover)) return false
  return true
}

export function legalMoves(board, from) {
  const arr = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (legal(board, from, [r, c])) arr.push([r, c])
    }
  }
  return arr
}

export function anyMove(board, side) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.side === side && legalMoves(board, [r, c]).length) return true
    }
  }
  return false
}


// All turn validation and terminal decisions live in the engine, independent of React.
export function positionResult(board, sideToMove) {
  if (!findGeneral(board, sideToMove)) return { winner: enemy(sideToMove), reason: 'capture' }
  if (!findGeneral(board, enemy(sideToMove))) return { winner: sideToMove, reason: 'capture' }
  if (!anyMove(board, sideToMove)) {
    return { winner: enemy(sideToMove), reason: inCheck(board, sideToMove) ? 'checkmate' : 'stalemate' }
  }
  return { winner: null, reason: null }
}

export function playMove(board, turn, from, to) {
  if (!inside(...from) || board[from[0]][from[1]]?.side !== turn) return null
  if (!findGeneral(board, turn) || !findGeneral(board, enemy(turn)) || !legal(board, from, to)) return null
  const next = clone(board)
  next[to[0]][to[1]] = next[from[0]][from[1]]
  next[from[0]][from[1]] = null
  const nextTurn = enemy(turn)
  const result = positionResult(next, nextTurn)
  return { board: next, turn: nextTurn, ...result }
}
