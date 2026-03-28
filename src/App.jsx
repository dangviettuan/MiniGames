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
function clone(board) { return board.map(row => row.map(cell => (cell ? { ...cell } : null))) }
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
  const [fr, fc] = from
  const [tr, tc] = to
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
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.type === 'general' && board[r][c]?.side === side) return [r, c]
    }
  }
  return null
}

function facing(board) {
  const r = findGeneral(board, RED)
  const b = findGeneral(board, BLACK)
  if (!r || !b || r[1] !== b[1]) return false
  return between(board, r, b) === 0
}

function rawValid(board, from, to) {
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
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (legal(board, from, [r, c])) arr.push([r, c])
    }
  }
  return arr
}

function anyMove(board, side) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.side === side && legalMoves(board, [r, c]).length) return true
    }
  }
  return false
}

function boardCellClass(r, c, selected) {
  let cls = 'cell'
  if ((r + c) % 2 === 0) cls += ' alt'
  if (r === 4) cls += ' riverTop'
  if (r === 5) cls += ' riverBottom'
  if (selected) cls += ' sel'
  return cls
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
        setHistory(prev => [`${NAMES[turn]}: ${moving.type} ${sr},${sc} → ${r},${c}${captured ? ` ăn ${captured.type}` : ''}`, ...prev].slice(0, 24))

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
        :root{--bg:#f7efe2;--board:#f4cf94;--line:#8b5a2b;--card:#fffaf4;--text:#1f2937;--muted:#57534e;--orange:#ea580c}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body{margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:radial-gradient(circle at top left,#fff9f0,#fef3c7 60%,#f9d27d)}
        button,input,select{font:inherit}

        .app{min-height:100svh;padding:calc(16px + env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));color:var(--text)}
        .wrap{max-width:1366px;margin:0 auto;display:grid;gap:20px;grid-template-columns:minmax(0,1.45fr) minmax(320px,.9fr)}

        .card{background:rgba(255,250,244,.9);border:1px solid rgba(139,92,45,.18);backdrop-filter:blur(8px);border-radius:24px;box-shadow:0 14px 38px rgba(120,53,15,.1);padding:18px}
        .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
        h1{font-size:clamp(24px,3.8vw,42px);line-height:1.08;margin:0 0 8px}
        .sub{margin:0;color:var(--muted);font-size:clamp(14px,1.7vw,18px)}

        .btn{border:none;border-radius:14px;padding:12px 18px;background:linear-gradient(135deg,#f97316,#c2410c);color:white;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(194,65,12,.28);min-height:46px}
        .btn:active{transform:translateY(1px)}

        .stats{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:14px}
        .stat{background:#fef1da;border:1px solid rgba(139,92,45,.12);border-radius:14px;padding:12px}
        .k{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
        .v{margin-top:2px;font-size:18px;font-weight:800;line-height:1.2}

        .boardShell{background:linear-gradient(180deg,#f7d8a3,#efc786);padding:14px;border-radius:20px;border:2px solid rgba(139,92,45,.35)}
        .board{position:relative;display:grid;grid-template-columns:repeat(9,minmax(0,1fr));border:2px solid var(--line);border-radius:14px;overflow:hidden;background:var(--board)}
        .board::before{content:'';position:absolute;left:0;right:0;top:50%;height:13.2%;transform:translateY(-50%);background:linear-gradient(180deg,rgba(186,230,253,.52),rgba(224,242,254,.66));z-index:0}
        .board::after{content:'';position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);border-top:2px solid rgba(139,92,45,.46);border-bottom:2px solid rgba(139,92,45,.46);height:13.2%;z-index:0}
        .cell{position:relative;aspect-ratio:1/1;background:rgba(255,252,245,.55);border:1px solid rgba(139,92,45,.24);cursor:pointer}
        .cell.alt{background:rgba(255,245,230,.65)}
        .cell.riverTop{border-bottom-color:rgba(139,92,45,.45);border-bottom-width:4px}
        .cell.riverBottom{border-top-color:rgba(139,92,45,.45);border-top-width:4px}
        .cell.riverTop,.cell.riverBottom{background:transparent}
        .cell.sel{outline:4px solid rgba(251,146,60,.88);outline-offset:-4px;z-index:2}
        .dot{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:999px;background:rgba(120,53,15,.55);border:2px solid rgba(255,255,255,.7);z-index:2}
        .piece{position:absolute;inset:10%;display:grid;place-items:center;border-radius:999px;background:#fffdf8;border:3px solid #1f2937;box-shadow:0 5px 10px rgba(31,41,55,.16);font-size:clamp(20px,2.35vw,30px);font-weight:800;user-select:none;z-index:2}
        .piece.red{color:#b91c1c;border-color:#b91c1c}
        .riverTag{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);display:flex;justify-content:space-between;padding:0 24px;pointer-events:none;z-index:0}
        .riverTag span{font-weight:900;letter-spacing:.35em;color:rgba(124,45,18,.78);text-shadow:0 1px 0 rgba(255,255,255,.7);font-size:clamp(13px,1.8vw,20px)}

        .meta{display:flex;justify-content:space-between;gap:14px;margin-top:10px;color:#7c2d12;font-weight:700}
        .river{font-size:clamp(12px,1.4vw,15px);opacity:.88}

        aside{display:grid;gap:20px;align-content:start}
        h2{margin:0 0 12px;font-size:22px}
        .rules{margin:0;padding-left:18px;line-height:1.65;color:#44403c}
        .history{display:grid;gap:8px;max-height:460px;overflow:auto;padding-right:2px}
        .item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;color:#334155;font-size:14px}
        .muted{color:#78716c}

        @media (min-width:768px) and (max-width:1194px){
          .app{padding:16px}
          .wrap{grid-template-columns:minmax(0,1fr)}
          .top{align-items:center}
          .card{padding:16px}
          .boardShell{padding:12px}
          .piece{font-size:clamp(22px,3.2vw,34px)}
          aside{grid-template-columns:1fr 1fr;gap:16px}
        }

        @media (max-width:767px){
          .app{padding:12px}
          .wrap{grid-template-columns:1fr}
          .top{flex-direction:column;align-items:stretch}
          .btn{width:100%}
          .stats{grid-template-columns:1fr}
          .boardShell{padding:10px}
          .piece{inset:9%;font-size:clamp(20px,7vw,30px)}
          aside{gap:14px}
          h2{font-size:20px}
        }
      `}</style>

      <div className="wrap">
        <section className="card">
          <div className="top">
            <div>
              <h1>Cờ tướng 2 người chơi</h1>
              <p className="sub">UI tối ưu cho cảm ứng iPad, dễ nhìn khi đặt ngang hoặc dọc.</p>
            </div>
            <button className="btn" onClick={reset}>Ván mới</button>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="k">Lượt hiện tại</div>
              <div className="v">{winner ? 'Kết thúc' : NAMES[turn]}</div>
            </div>
            <div className="stat">
              <div className="k">Trạng thái</div>
              <div className="v">{winner ? `Thắng: ${NAMES[winner]}` : checked ? `${NAMES[turn]} đang bị chiếu` : 'Bình thường'}</div>
            </div>
            <div className="stat">
              <div className="k">Quân đang chọn</div>
              <div className="v">{pick ? label(board[pick[0]][pick[1]]) : 'Chưa chọn'}</div>
            </div>
          </div>

          <div className="boardShell">
            <div className="board" role="grid" aria-label="Bàn cờ tướng">
              {board.map((row, r) => row.map((piece, c) => {
                const selected = !!pick && pick[0] === r && pick[1] === c
                const canMove = moveSet.has(`${r}-${c}`)
                return (
                  <button key={`${r}-${c}`} className={boardCellClass(r, c, selected)} onClick={() => clickCell(r, c)}>
                    {canMove ? <span className="dot" /> : null}
                    {piece ? <span className={`piece ${piece.side}`}>{label(piece)}</span> : null}
                  </button>
                )
              }))}
              <div className="riverTag" aria-hidden="true">
                <span>楚河</span>
                <span>漢界</span>
              </div>
            </div>
            <div className="meta">
              <span className="river">Sở Hà • Hán Giới</span>
              <span className="river">Chạm quân để xem nước đi hợp lệ</span>
            </div>
          </div>
        </section>

        <aside>
          <section className="card">
            <h2>Luật đã cài</h2>
            <ul className="rules">
              <li>Đầy đủ luật đi quân cơ bản của cờ tướng.</li>
              <li>Có chặn chân mã, chặn mắt tượng, pháo ăn cần đúng 1 vật cản.</li>
              <li>Cấm lộ mặt tướng.</li>
              <li>Không cho đi nước khiến phe mình tự bị chiếu.</li>
              <li>Thắng khi ăn tướng, chiếu bí, hoặc đối thủ hết nước hợp lệ.</li>
            </ul>
          </section>

          <section className="card">
            <h2>Lịch sử nước đi</h2>
            {history.length ? (
              <div className="history">
                {history.map((x, i) => <div key={i} className="item">{x}</div>)}
              </div>
            ) : (
              <p className="muted">Chưa có nước nào. Bàn cờ đang nín thở.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
