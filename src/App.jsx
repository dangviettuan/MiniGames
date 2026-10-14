import React, { useMemo, useState } from 'react'

import { RED, NAMES, initBoard, label, enemy, clone, findGeneral, anyMove, inCheck, legal, legalMoves } from './xiangqi/engine.js'

function boardCellClass(r, c, selected) {
  let cls = 'cell'
  if ((r + c) % 2 === 0) cls += ' alt'
  if (selected) cls += ' sel'
  return cls
}

export default function App() {
  const [board, setBoard] = useState(initBoard)
  const [turn, setTurn] = useState(RED)
  const [pick, setPick] = useState(null)
  const [winner, setWinner] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [cursor, setCursor] = useState(0)
  const history = timeline.slice(0, cursor).map(entry => entry.description).reverse()

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
    setTimeline([])
    setCursor(0)
  }

  function navigate(delta) {
    const target = cursor + delta
    if (target < 0 || target > timeline.length) return
    const state = delta < 0 ? timeline[cursor - 1].before : timeline[cursor].after
    setBoard(clone(state.board))
    setTurn(state.turn)
    setWinner(state.winner)
    setPick(null)
    setCursor(target)
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

        setBoard(next)
        setPick(null)
        setTimeline(prev => [...prev.slice(0, cursor), { before: { board: clone(board), turn, winner }, after: { board: clone(next), turn: (!live || !foeHasMove) ? turn : nextTurn, winner: (!live || !foeHasMove) ? turn : null }, description: `${NAMES[turn]}: ${moving.type} ${sr},${sc} → ${r},${c}${captured ? ` ăn ${captured.type}` : ''}` }])
        setCursor(cursor + 1)

        if (!live || !foeHasMove) {
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
        .btn:active{transform:translateY(1px)}.btn:disabled{opacity:.4;cursor:not-allowed}.controls{display:flex;gap:8px;flex-wrap:wrap}.btn.secondary{background:#fff7ed;color:#9a3412;border:1px solid #fdba74;box-shadow:none}

        .stats{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:14px}
        .stat{background:#fef1da;border:1px solid rgba(139,92,45,.12);border-radius:14px;padding:12px}
        .k{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
        .v{margin-top:2px;font-size:18px;font-weight:800;line-height:1.2}

        .boardShell{background:linear-gradient(180deg,#f7d8a3,#efc786);padding:14px;border-radius:20px;border:2px solid rgba(139,92,45,.35)}
        .board{position:relative;display:grid;grid-template-columns:repeat(9,minmax(0,1fr));grid-template-rows:repeat(10,minmax(0,1fr));aspect-ratio:9/10;background:#f4cf94;border:2px solid var(--line);border-radius:12px;overflow:hidden}.boardLines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
        .cell{position:relative;min-width:0;min-height:0;padding:0;background:transparent;border:0;cursor:pointer;z-index:1}
        .cell.alt{background:transparent}
        .cell.sel .piece{box-shadow:0 0 0 4px #fb923c,0 5px 10px #5555}
        .dot{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:999px;background:rgba(120,53,15,.55);border:2px solid rgba(255,255,255,.7)}
        .piece{position:absolute;inset:7%;display:grid;place-items:center;border-radius:999px;background:#fffdf8;border:3px solid #1f2937;box-shadow:0 5px 10px rgba(31,41,55,.16);font-size:clamp(20px,2.35vw,30px);font-weight:800;user-select:none}
        .piece.red{color:#b91c1c;border-color:#b91c1c}

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
          .btn{width:100%}.controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.controls .btn{padding:10px 4px;font-size:13px}
          .stats{grid-template-columns:repeat(2,minmax(0,1fr))}.stat:last-child{grid-column:1/-1}
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
            <div className="controls"><button className="btn secondary" onClick={() => navigate(-1)} disabled={cursor === 0}>↶ Undo</button><button className="btn secondary" onClick={() => navigate(1)} disabled={cursor === timeline.length}>↷ Redo</button><button className="btn" onClick={reset}>Ván mới</button></div>
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
              <svg className="boardLines" viewBox="0 0 900 1000" preserveAspectRatio="none" aria-hidden="true"><g stroke="#8b5a2b" strokeWidth="3" fill="none">{Array.from({length:10},(_,r)=><line key={`h${r}`} x1="50" y1={50+r*100} x2="850" y2={50+r*100}/>)}{Array.from({length:9},(_,c)=><React.Fragment key={`v${c}`}><line x1={50+c*100} y1="50" x2={50+c*100} y2="450"/><line x1={50+c*100} y1="550" x2={50+c*100} y2="950"/></React.Fragment>)}<path d="M350 50 L550 250 M550 50 L350 250 M350 750 L550 950 M550 750 L350 950"/></g><text x="450" y="510" textAnchor="middle" fontSize="43" fill="#8b5a2b">楚 河　漢 界</text></svg>
              {board.map((row, r) => row.map((piece, c) => {
                const selected = !!pick && pick[0] === r && pick[1] === c
                const canMove = moveSet.has(`${r}-${c}`)
                return (
                  <button key={`${r}-${c}`} type="button" aria-label={`Hàng ${r + 1}, cột ${c + 1}${piece ? `, ${NAMES[piece.side]} ${piece.type}` : ", trống"}${selected ? ", đang chọn" : ""}${canMove ? ", có thể đi tới" : ""}`} aria-pressed={selected} className={boardCellClass(r, c, selected)} onClick={() => clickCell(r, c)}>
                    {canMove ? <span className="dot" /> : null}
                    {piece ? <span className={`piece ${piece.side}`}>{label(piece)}</span> : null}
                  </button>
                )
              }))}
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
