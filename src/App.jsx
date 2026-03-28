import React, { useMemo, useState } from 'react'

const COLS = 9
const ROWS = 10
const RED = 'red'
const BLACK = 'black'

const TXT = {
  red: { general: '帥', advisor: '士', elephant: '相', horse: '傌', rook: '俥', cannon: '炮', soldier: '兵' },
  black: { general: '將', advisor: '仕', elephant: '象', horse: '馬', rook: '車', cannon: '砲', soldier: '卒' },
}

const NAMES = { red: 'Đỏ', black: 'Đen' }

function mk(type, side, id) { return { type, side, id } }
function inside(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS }
function clone(board) { return board.map(row => row.map(cell => cell ? { ...cell } : null)) }
function enemy(side) { return side === RED ? BLACK : RED }
function label(piece) { return piece ? TXT[piece.side][piece.type] : '' }

function initBoard() {
  const b = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  b[0][0] = mk('rook', BLACK, 'br1'); b[0][1] = mk('horse', BLACK, 'bh1'); b[0][2] = mk('elephant', BLACK, 'be1'); b[0][3] = mk('advisor', BLACK, 'ba1'); b[0][4] = mk('general', BLACK, 'bg'); b[0][5] = mk('advisor', BLACK, 'ba2'); b[0][6] = mk('elephant', BLACK, 'be2'); b[0][7] = mk('horse', BLACK, 'bh2'); b[0][8] = mk('rook', BLACK, 'br2')
  b[2][1] = mk('cannon', BLACK, 'bc1'); b[2][7] = mk('cannon', BLACK, 'bc2')
  b[3][0] = mk('soldier', BLACK, 'bs1'); b[3][2] = mk('soldier', BLACK, 'bs2'); b[3][4] = mk('soldier', BLACK, 'bs3'); b[3][6] = mk('soldier', BLACK, 'bs4'); b[3][8] = mk('soldier', BLACK, 'bs5')

  b[9][0] = mk('rook', RED, 'rr1'); b[9][1] = mk('horse', RED, 'rh1'); b[9][2] = mk('elephant', RED, 're1'); b[9][3] = mk('advisor', RED, 'ra1'); b[9][4] = mk('general', RED, 'rg'); b[9][5] = mk('advisor', RED, 'ra2'); b[9][6] = mk('elephant', RED, 're2'); b[9][7] = mk('horse', RED, 'rh2'); b[9][8] = mk('rook', RED, 'rr2')
  b[7][1] = mk('cannon', RED, 'rc1'); b[7][7] = mk('cannon', RED, 'rc2')
  b[6][0] = mk('soldier', RED, 'rs1'); b[6][2] = mk('soldier', RED, 'rs2'); b[6][4] = mk('soldier', RED, 'rs3'); b[6][6] = mk('soldier', RED, 'rs4'); b[6][8] = mk('soldier', RED, 'rs5')
  return b
}

function palace(side, r, c) {
  return side === BLACK ? r >= 0 && r <= 2 && c >= 3 && c <= 5 : r >= 7 && r <= 9 && c >= 3 && c <= 5
}
function crossed(side, r) { return side === RED ? r <= 4 : r >= 5 }

function between(board, from, to) {
  const [fr, fc] = from, [tr, tc] = to
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

function findGeneral(board, side) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]?.type === 'general' && board[r][c]?.side === side) return [r, c]
  return null
}

function facing(board) {
  const r = findGeneral(board, RED), b = findGeneral(board, BLACK)
  if (!r || !b || r[1] !== b[1]) return false
  return between(board, r, b) === 0
}

function rawValid(board, from, to) {
  const [fr, fc] = from, [tr, tc] = to
  if (!inside(fr, fc) || !inside(tr, tc) || (fr === tr && fc === tc)) return false
  const p = board[fr][fc], t = board[tr][tc]
  if (!p) return false
  if (t && t.side === p.side) return false
  const dr = tr - fr, dc = tc - fc, adr = Math.abs(dr), adc = Math.abs(dc)

  switch (p.type) {
    case 'general':
      return palace(p.side, tr, tc) && adr + adc === 1
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

function inCheck(board, side) {
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

function legal(board, from, to) {
  if (!rawValid(board, from, to)) return false
  const next = clone(board)
  next[to[0]][to[1]] = next[from[0]][from[1]]
  next[from[0]][from[1]] = null
  const mover = next[to[0]][to[1]].side
  if (facing(next)) return false
  if (inCheck(next, mover)) return false
  return true
}

function legalMoves(board, from) {
  const arr = []
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (legal(board, from, [r, c])) arr.push([r, c])
  return arr
}

function anyMove(board, side) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]?.side === side && legalMoves(board, [r, c]).length) return true
  return false
}

export default function App() {
  const [board, setBoard] = useState(initBoard)
  const [turn, setTurn] = useState(RED)
  const [pick, setPick] = useState(null)
  const [winner, setWinner] = useState(null)
  const [history, setHistory] = useState([])

  const moves = useMemo(() => {
    if (!pick || winner) return []
    const p = board[pick[0]][pick[1]]
    if (!p || p.side !== turn) return []
    return legalMoves(board, pick)
  }, [board, pick, turn, winner])

  const moveSet = useMemo(() => new Set(moves.map(([r, c]) => `${r}-${c}`)), [moves])
  const checked = !winner && inCheck(board, turn)

  function reset() {
    setBoard(initBoard())
    setTurn(RED)
    setPick(null)
    setWinner(null)
    setHistory([])
  }

  function clickCell(r, c) {
    if (winner) return
    const piece = board[r][c]
    if (pick) {
      const [sr, sc] = pick
      if (piece && piece.side === turn) {
        setPick([r, c])
        return
      }
      if (legal(board, [sr, sc], [r, c])) {
        const next = clone(board)
        const moving = next[sr][sc]
        const captured = next[r][c]
        next[r][c] = moving
        next[sr][sc] = null
        const nextTurn = enemy(turn)
        const live = !!findGeneral(next, nextTurn)
        const foeHasMove = live ? anyMove(next, nextTurn) : false
        const foeCheck = live ? inCheck(next, nextTurn) : true
        setBoard(next)
        setPick(null)
        setHistory(prev => [`${NAMES[turn]}: ${moving.type} ${sr},${sc} → ${r},${c}${captured ? ` ăn ${captured.type}` : ''}`, ...prev].slice(0, 18))
        if (!live || !foeHasMove || (foeCheck && !foeHasMove)) {
          setWinner(turn)
        } else {
          setTurn(nextTurn)
        }
        return
      }
    }
    if (piece && piece.side === turn) setPick([r, c])
    else setPick(null)
  }

  return (
    <div className="app">
      <style>{`
        *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at top left,#fff7ed,#fffbeb 55%,#fde68a)}
        .app{min-height:100vh;padding:24px;color:#1f2937}
        .wrap{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:24px}
        .card{background:rgba(255,255,255,.84);border:1px solid rgba(120,53,15,.08);backdrop-filter:blur(8px);border-radius:28px;box-shadow:0 18px 40px rgba(120,53,15,.08);padding:24px}
        h1{font-size:clamp(28px,4vw,44px);line-height:1.05;margin:0 0 10px}.sub{margin:0;color:#57534e}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}
        .btn{border:none;border-radius:16px;padding:12px 18px;background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff;font-weight:700;cursor:pointer;box-shadow:0 10px 20px rgba(194,65,12,.24)}
        .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.stat{background:#ffedd5;border-radius:18px;padding:16px}.k{font-size:13px;color:#78716c}.v{font-size:22px;font-weight:800}
        .boardWrap{background:#fcdba7;padding:14px;border-radius:28px;box-shadow:inset 0 4px 18px rgba(120,53,15,.15)} .board{display:grid;grid-template-columns:repeat(9,1fr);overflow:hidden;border-radius:20px;border:2px solid rgba(120,53,15,.25)}
        .cell{position:relative;aspect-ratio:1/1;border:1px solid rgba(120,53,15,.18);background:rgba(255,251,235,.94);cursor:pointer}.cell.alt{background:rgba(255,247,237,.94)} .cell.sel{outline:4px solid rgba(251,146,60,.88);outline-offset:-4px;z-index:2}
        .dot{position:absolute;left:50%;top:50%;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(120,53,15,.35)}
        .piece{position:absolute;inset:8%;display:grid;place-items:center;border-radius:999px;background:#fffdf7;border:3px solid #1f2937;box-shadow:0 6px 14px rgba(31,41,55,.14);font-size:clamp(22px,2vw,34px);font-weight:800}.piece.red{color:#b91c1c;border-color:#b91c1c}
        h2{margin:0 0 12px}.rules{margin:0;padding-left:18px;line-height:1.75;color:#44403c}.history{display:grid;gap:10px;max-height:460px;overflow:auto}.item{background:#f8fafc;border-radius:16px;padding:12px 14px;color:#334155}.muted{color:#78716c}
        @media (max-width:1080px){.wrap{grid-template-columns:1fr}} @media (max-width:720px){.app{padding:14px}.top{flex-direction:column}.stats{grid-template-columns:1fr}.card{padding:16px}}
      `}</style>
      <div className="wrap">
        <section className="card">
          <div className="top">
            <div>
              <h1>MiniGames: Cờ tướng 2 người chơi</h1>
              <p className="sub">Không quảng cáo, không boss. Chỉ có hai người và bàn cờ nóng như chảo gang.</p>
            </div>
            <button className="btn" onClick={reset}>Ván mới</button>
          </div>

          <div className="stats">
            <div className="stat"><div className="k">Lượt hiện tại</div><div className="v">{winner ? 'Kết thúc' : NAMES[turn]}</div></div>
            <div className="stat"><div className="k">Trạng thái</div><div className="v">{winner ? `Thắng: ${NAMES[winner]}` : checked ? `${NAMES[turn]} đang bị chiếu` : 'Bình thường'}</div></div>
            <div className="stat"><div className="k">Quân đang chọn</div><div className="v">{pick ? label(board[pick[0]][pick[1]]) : 'Chưa chọn'}</div></div>
          </div>

          <div className="boardWrap">
            <div className="board">
              {board.map((row, r) => row.map((piece, c) => {
                const sel = !!pick && pick[0] === r && pick[1] === c
                const can = moveSet.has(`${r}-${c}`)
                return (
                  <button key={`${r}-${c}`} className={`cell ${(r + c) % 2 === 0 ? 'alt' : ''} ${sel ? 'sel' : ''}`} onClick={() => clickCell(r, c)}>
                    {can ? <span className="dot" /> : null}
                    {piece ? <span className={`piece ${piece.side}`}>{label(piece)}</span> : null}
                  </button>
                )
              }))}
            </div>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 24 }}>
          <section className="card">
            <h2>Luật đã cài</h2>
            <ul className="rules">
              <li>Đầy đủ đi quân cơ bản của cờ tướng.</li>
              <li>Có chặn chân mã, chặn mắt tượng, pháo ăn cần đúng 1 vật cản.</li>
              <li>Cấm lộ mặt tướng.</li>
              <li>Không cho đi nước khiến phe mình tự bị chiếu.</li>
              <li>Thắng khi ăn tướng hoặc chiếu bí, hoặc đối thủ hết nước hợp lệ.</li>
            </ul>
          </section>
          <section className="card">
            <h2>Lịch sử nước đi</h2>
            {history.length ? <div className="history">{history.map((x, i) => <div key={i} className="item">{x}</div>)}</div> : <p className="muted">Chưa có nước nào. Bàn cờ đang nín thở.</p>}
          </section>
        </aside>
      </div>
    </div>
  )
}
