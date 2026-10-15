import React, { useState } from 'react'
import { createGame, rollDice, moveHorse, legalMoves, undo, redo, COLORS, NAMES, trackSquare } from '../../co-ca-ngua/engine.js'
import './style.css'

const rotate = ([r, c], seat) => {
  for (let i = 0; i < seat; i++) [r, c] = [c, 15 - r]
  return [r, c]
}
const quarter = [...Array.from({ length: 6 }, (_, c) => [6, c]), ...Array.from({ length: 6 }, (_, i) => [5 - i, 6]), [0, 7], [0, 8]]
const track = Array.from({ length: 4 }, (_, seat) => quarter.map(p => rotate(p, seat))).flat()
const homes = Array.from({ length: 4 }, (_, seat) => Array.from({ length: 6 }, (_, i) => rotate([7, i + 1], seat)))
const stablePositions = [[1, 1], [1, 10], [10, 10], [10, 1]]
const placement = ([r, c]) => ({ gridRow: r + 1, gridColumn: c + 1 })
const locationName = progress => progress < 0 ? 'trong chuồng' : progress < 56 ? `đường đua ${progress + 1}/56` : `đích ${progress - 55}`

function CoCaNgua() {
  const [players, setPlayers] = useState(2)
  const [startRule, setStartRule] = useState('one-or-six')
  const [game, setGame] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const start = () => { setGame(createGame({ players, startRule })); setSelected(null); setConfirmReset(false) }
  const apply = fn => { setGame(fn); setSelected(null) }
  const seat = game?.seats[game.current]
  const moves = game ? legalMoves(game) : []
  const selectedMove = moves.find(m => m.horse === selected)
  const horseAt = (s, progress) => game?.horses[s].findIndex(p => p === progress)
  const trackHorse = square => {
    for (const s of game.seats) for (let horse = 0; horse < 4; horse++) {
      const p = game.horses[s][horse]
      if (p >= 0 && p < 56 && trackSquare(s, p) === square) return { seat: s, horse }
    }
    return null
  }
  const activateHorse = (s, horse) => { if (s === seat && moves.some(m => m.horse === horse)) setSelected(horse) }
  const move = () => { if (selectedMove) apply(g => moveHorse(g, selected)) }
  const roll = () => {
    // Sample once in the event handler: React StrictMode may invoke an updater twice.
    const random = game.rollCursor < game.tape.length ? null : crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
    apply(g => rollDice(g, () => random))
  }
  const horseLabel = h => `${NAMES[h.seat]} ngựa ${h.horse + 1}`
  return <section className="horse-game" aria-label="Trò chơi cờ cá ngựa">
    <header><div><p className="horse-eyebrow">2–4 người · chung thiết bị</p><h1>Cờ cá ngựa</h1></div>{game && <button onClick={() => setConfirmReset(true)}>Ván mới</button>}</header>
    {!game ? <div className="horse-setup">
      <h2>Chọn luật trước khi chơi</h2>
      <label>Số người chơi<select value={players} onChange={e => setPlayers(Number(e.target.value))}><option value="2">2 người — Đỏ và Vàng</option><option value="3">3 người</option><option value="4">4 người</option></select></label>
      <label>Ra chuồng khi gieo<select value={startRule} onChange={e => setStartRule(e.target.value)}><option value="one-or-six">1 hoặc 6</option><option value="six">Chỉ số 6</option></select></label>
      <p>Mỗi lượt gieo một xúc xắc. Gieo 6 được thêm lượt. Không có ô an toàn: đáp đúng ô đối phương để đá về chuồng. Không được nhảy qua ngựa hoặc đáp lên ngựa cùng màu.</p>
      <p>Đi hết 56 ô mới vào đường đích riêng 1–6. Đi đúng số xúc xắc, không vượt ô 6 hoặc nhảy qua ngựa trong đích. Đưa đủ bốn ngựa vào các ô <strong>3, 4, 5, 6</strong> để thắng. Hãy đưa ngựa đầu vào ô 6, rồi lần lượt ô 5, 4, 3 để tránh chặn nhau.</p>
      <p>Undo/Redo giữ nguyên kết quả xúc xắc; hoàn tác không đổi được số đã gieo.</p>
      <button className="horse-primary" onClick={start}>Bắt đầu chơi</button>
    </div> : <>
      <div className="horse-layout">
        <div className="horse-board" role="group" aria-label="Bàn cờ cá ngựa, đường đua 56 ô">
          <div className="horse-center"><span>♞</span><small>56 Ô</small></div>
          {track.map((pos, square) => {
            const horse = trackHorse(square)
            const destination = selectedMove?.to < 56 && trackSquare(seat, selectedMove.to) === square
            const startSeat = square % 14 === 0 ? square / 14 : null
            const legalHorse = horse?.seat === seat && moves.some(m => m.horse === horse.horse)
            return <button key={`track-${square}`} style={placement(pos)} className={`horse-cell ${horse ? 'horse-'+COLORS[horse.seat] : ''} ${startSeat !== null ? 'horse-start horse-start-'+COLORS[startSeat] : ''} ${destination ? 'horse-destination' : ''} ${legalHorse ? 'horse-legal' : ''}`} aria-label={`Ô đường đua ${square + 1}${horse ? ', '+horseLabel(horse) : ', trống'}${destination ? ', có thể đi tới' : ''}`} onClick={() => destination ? move() : horse && activateHorse(horse.seat, horse.horse)} disabled={!destination && !legalHorse}>{horse ? <span>♞<b>{horse.horse + 1}</b></span> : startSeat !== null ? '↗' : '·'}</button>
          })}
          {game.seats.map(s => homes[s].map((pos, i) => {
            const h = horseAt(s, 56 + i)
            const destination = seat === s && selectedMove?.to === 56 + i
            const legalHorse = s === seat && h >= 0 && moves.some(m => m.horse === h)
            return <button key={`home-${s}-${i}`} style={placement(pos)} className={`horse-cell horse-home horse-${COLORS[s]} ${destination ? 'horse-destination' : ''} ${legalHorse ? 'horse-legal' : ''}`} aria-label={`Đích ${NAMES[s]} ô ${i + 1}${h >= 0 ? ', ngựa '+(h + 1) : ', trống'}${destination ? ', có thể đi tới' : ''}`} onClick={() => destination ? move() : h >= 0 && activateHorse(s, h)} disabled={!destination && !legalHorse}>{h >= 0 ? <span>♞<b>{h + 1}</b></span> : i + 1}</button>
          }))}
          {game.seats.map(s => <div key={`stable-${s}`} className={`horse-stable horse-${COLORS[s]}`} style={{ ...placement(stablePositions[s]), gridRowEnd: 'span 5', gridColumnEnd: 'span 5' }}><strong>{NAMES[s]}</strong><div>{game.horses[s].map((p, h) => p === -1 ? <button key={h} aria-label={`${NAMES[s]} ngựa ${h + 1} trong chuồng`} disabled={s !== seat || !moves.some(m => m.horse === h)} aria-pressed={selected === h && s === seat} onClick={() => activateHorse(s, h)}>♞<small>{h + 1}</small></button> : <span className="horse-stable-empty" key={h}>·</span>)}</div></div>)}
        </div>
        <aside className="horse-actions" aria-label="Chọn nước đi">
      <div className="horse-controls">
        <div className={`horse-turn horse-${COLORS[seat]}`}><strong>{game.winner !== null ? `${NAMES[game.winner]} thắng!` : `Lượt ${NAMES[seat]}`}</strong><span aria-label={game.die ? `Xúc xắc ${game.die}` : 'Chưa gieo xúc xắc'} className="horse-die">{game.die ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][game.die - 1] : '—'}</span></div>
        <button className="horse-primary" disabled={game.phase !== 'roll'} onClick={roll}>Gieo xúc xắc</button>
        <div className="horse-history"><button disabled={!game.past.length} onClick={() => apply(undo)}>Undo</button><button disabled={!game.future.length} onClick={() => apply(redo)}>Redo</button></div>
      </div>
      <p className="horse-status" role="status" aria-live="polite">{game.message}</p>

          <h2>{game.phase === 'move' ? 'Chọn ngựa → đi tới' : game.winner !== null ? 'Ván đã kết thúc' : 'Sẵn sàng gieo'}</h2>
          <div className="horse-options">{game.horses[seat].map((p, horse) => <button key={horse} disabled={!moves.some(m => m.horse === horse)} aria-pressed={selected === horse} onClick={() => setSelected(horse)}><strong>Ngựa {horse + 1}</strong><small>{locationName(p)}</small></button>)}</div>
          <button className="horse-primary horse-move" disabled={!selectedMove} onClick={move}>{selectedMove ? `Đi ngựa ${selected + 1} → ${locationName(selectedMove.to)}` : 'Chọn một ngựa để đi'}</button>
          <details><summary>Hướng dẫn &amp; luật ván này</summary><p className="horse-help">Ô có viền sáng là nước hợp lệ. Chọn ngựa ở bảng này hoặc trên bàn; chạm ô đích sáng để đi.</p><p>{game.seats.length} người · Ra chuồng: {startRule === 'six' ? 'chỉ 6' : '1 hoặc 6'}. Gieo 6 thêm lượt, không nhảy ngựa, không ô an toàn. Về đích chính xác; lấp ô 3–6 để thắng. Undo giữ số gieo.</p></details>
        </aside>
      </div>
      {confirmReset && <dialog className="horse-reset" ref={node => { if (node && !node.open) node.showModal() }} onCancel={() => setConfirmReset(false)} aria-label="Bắt đầu ván mới"><h2>Bắt đầu ván mới?</h2><p>Ván đang chơi và lịch sử Undo/Redo sẽ được xóa.</p><button onClick={() => { setGame(null); setSelected(null); setConfirmReset(false) }}>Đồng ý, chọn lại luật</button><button autoFocus onClick={() => setConfirmReset(false)}>Tiếp tục ván này</button></dialog>}
    </>}
  </section>
}
export default { id: 'co-ca-ngua', title: 'Cờ cá ngựa', component: CoCaNgua }
