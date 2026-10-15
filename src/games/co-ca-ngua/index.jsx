import React, { useState } from 'react'
import { createGame, rollDice, moveHorse, legalMoves, undo, redo, COLORS, NAMES, trackSquare, occupants } from '../../co-ca-ngua/engine.js'
import { PlayLayout, ConfirmDialog } from '../../shared/PlayLayout.jsx'
import { useStoredGame } from '../../shared/useStoredGame.js'
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
const locationName = progress => progress < 0 ? 'chuồng' : progress < 56 ? `ô ${progress + 1}` : `đích ${progress - 55}`
const initial = () => ({ game: null, players: 2, startRule: 'one-or-six' })

// Treat saved data as untrusted input, including every history snapshot.
function validSaved(data) {
  if (!data || ![2, 3, 4].includes(data.players) || !['one-or-six', 'six'].includes(data.startRule)) return false
  if (data.game === null) return true
  const game = data.game
  if (!game || !Array.isArray(game.tape) || game.tape.length > 20000 || !game.tape.every(n => Number.isInteger(n) && n >= 1 && n <= 6)) return false
  const seats = createGame({ players: data.players }).seats
  const snapshot = s => s && JSON.stringify(s.seats) === JSON.stringify(seats) && s.startRule === data.startRule && Number.isInteger(s.current) && s.current >= 0 && s.current < seats.length && ['roll', 'move', 'finished'].includes(s.phase) && (s.die === null || Number.isInteger(s.die) && s.die >= 1 && s.die <= 6) && (s.phase !== 'move' || s.die !== null) && (s.winner === null || seats.includes(s.winner)) && (s.phase === 'finished') === (s.winner !== null) && typeof s.message === 'string' && s.message.length < 1000 && Number.isInteger(s.rollCursor) && s.rollCursor >= 0 && s.rollCursor <= game.tape.length && Array.isArray(s.horses) && s.horses.length === 4 && s.horses.every(row => Array.isArray(row) && row.length === 4 && row.every(p => Number.isInteger(p) && p >= -1 && p <= 61) && new Set(row.filter(p => p >= 0)).size === row.filter(p => p >= 0).length)
  return snapshot(game) && ['past', 'future'].every(key => Array.isArray(game[key]) && game[key].length <= 40000 && game[key].every(snapshot))
}
function lastMove(game) {
  if (!game) return null
  const states = [...game.past, game]
  for (let i = states.length - 1; i > 0; i--) {
    const before = states[i - 1], after = states[i], seat = before.seats[before.current]
    const horse = before.horses[seat].findIndex((p, h) => p !== after.horses[seat][h])
    if (horse >= 0) return { seat, horse, from: before.horses[seat][horse], to: after.horses[seat][horse] }
  }
  return null
}
function blockedReason(game, horse) {
  if (game.phase !== 'move') return 'Gieo xúc xắc trước khi chọn ngựa.'
  const seat = game.seats[game.current], p = game.horses[seat][horse]
  if (p === -1) return game.die !== 6 && !(game.die === 1 && game.startRule === 'one-or-six') ? `Ra chuồng cần ${game.startRule === 'six' ? 'số 6' : 'số 1 hoặc 6'}.` : 'Ô xuất phát có ngựa cùng màu, hãy đi ngựa đó trước.'
  if (p + game.die > 61) return 'Vượt ô đích 6. Cần gieo đúng số để vào đích.'
  for (let at = p + 1; at <= p + game.die; at++) {
    if (at < 56 && occupants(game, trackSquare(seat, at)).length) return at < p + game.die ? 'Có ngựa chặn đường. Không được nhảy qua ngựa.' : 'Không thể đáp lên ngựa cùng màu.'
    if (at >= 56 && game.horses[seat].some((v, h) => h !== horse && v === at)) return 'Có ngựa chặn đường đích. Không được nhảy hoặc đáp lên ngựa.'
  }
  return 'Ngựa này chưa có nước đi hợp lệ.'
}
function Token({ number }) {
  return <svg className="horse-token" viewBox="0 0 32 32" aria-hidden="true"><text x="1" y="25" fontSize="30" fill="currentColor">♞</text><circle cx="25" cy="25" r="6.5" fill="white" stroke="currentColor" strokeWidth="1"/><text x="25" y="28.5" fontSize="10" textAnchor="middle" fontWeight="800" fill="currentColor">{number}</text></svg>
}
const rules = <><p>Gieo 6 được thêm lượt. Không có ô an toàn: đáp lên ngựa đối phương để đá về chuồng. Không được nhảy qua ngựa hoặc đáp lên ngựa cùng màu.</p><p>Đi hết một vòng rồi vào đường đích riêng, đúng số xúc xắc, không vượt ô 6. Đưa ngựa lần lượt vào ô <strong>6, 5, 4, 3</strong> để thắng, tránh tự chặn đường.</p><p>Undo/Redo giữ nguyên xúc xắc đã gieo. Ván, số gieo và lịch sử được lưu trên thiết bị.</p></>

function CoCaNgua() {
  const [stored, setStored, saved] = useStoredGame('co-ca-ngua', initial, validSaved)
  const { game, players, startRule } = stored
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const apply = action => { setStored(s => ({ ...s, game: typeof action === 'function' ? action(s.game) : action })); setSelected(null); setFeedback('') }
  const start = () => { apply(createGame({ players, startRule })); setConfirmReset(false) }
  const seat = game?.seats[game.current]
  const moves = game ? legalMoves(game) : []
  const selectedMove = moves.find(m => m.horse === selected)
  const latest = lastMove(game)
  const activateHorse = (s, horse) => {
    if (s !== seat) { setFeedback(`Đang là lượt ${NAMES[seat]}.`); return }
    if (!moves.some(m => m.horse === horse)) { setFeedback(`Ngựa ${horse + 1}: ${blockedReason(game, horse)}`); setSelected(null); return }
    setSelected(horse); setFeedback('')
  }
  const move = () => { if (selectedMove) apply(g => moveHorse(g, selected)) }
  const roll = () => {
    // Sample once in the event handler: StrictMode may call a state updater twice.
    const random = game.rollCursor < game.tape.length ? null : crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
    apply(g => rollDice(g, () => random))
  }
  if (!game) return <section className="horse-setup" aria-label="Thiết lập cờ cá ngựa"><h1>Cờ cá ngựa</h1><p className="horse-subtitle">Đua bốn ngựa về đích · 2–4 người cùng thiết bị</p><h2>Chọn luật trước khi chơi</h2><label>Số người chơi<select value={players} onChange={e => setStored(s => ({ ...s, players: Number(e.target.value) }))}><option value="2">2 người — Đỏ và Vàng</option><option value="3">3 người</option><option value="4">4 người</option></select></label><label>Ra chuồng khi gieo<select value={startRule} onChange={e => setStored(s => ({ ...s, startRule: e.target.value }))}><option value="one-or-six">1 hoặc 6</option><option value="six">Chỉ số 6</option></select></label><p>Đi hết một vòng; đưa đủ bốn ngựa vào đích 3, 4, 5, 6.</p><button className="horse-start-button" onClick={start}>Bắt đầu chơi</button><details><summary>Luật chơi &amp; cách thao tác</summary>{rules}</details></section>
  const horseLabel = h => `${NAMES[h.seat]} ngựa ${h.horse + 1}`
  const trackHorse = square => {
    for (const s of game.seats) for (let horse = 0; horse < 4; horse++) {
      const p = game.horses[s][horse]
      if (p >= 0 && p < 56 && trackSquare(s, p) === square) return { seat: s, horse }
    }
    return null
  }
  const isLast = (s, progress, kind) => latest?.seat === s && latest[kind] === progress
  const board = <div className="horse-board" role="group" aria-label="Bàn cờ cá ngựa, đường đua 56 ô">
    <div className="horse-center" aria-label="Đi theo mũi tên, hết vòng vào đích riêng"><span aria-hidden="true">↻</span></div>
    {track.map((pos, square) => {
      const horse = trackHorse(square), next = track[(square + 1) % 56]
      const arrow = next[0] > pos[0] ? '↓' : next[0] < pos[0] ? '↑' : next[1] > pos[1] ? '→' : '←'
      const destination = selectedMove?.to < 56 && trackSquare(seat, selectedMove.to) === square
      const startSeat = square % 14 === 0 ? square / 14 : null
      const entrySeat = square % 14 === 13 ? (Math.floor(square / 14) + 1) % 4 : null
      const last = latest && latest.to < 56 && trackSquare(latest.seat, latest.to) === square
      const origin = latest && latest.from >= 0 && latest.from < 56 && trackSquare(latest.seat, latest.from) === square
      const legalHorse = horse?.seat === seat && moves.some(m => m.horse === horse.horse)
      return <button key={`track-${square}`} style={{ ...placement(pos), ...(entrySeat !== null ? { '--entry-color': `var(--horse-${COLORS[entrySeat]})` } : {}) }} className={`horse-cell ${horse ? 'horse-'+COLORS[horse.seat] : ''} ${startSeat !== null ? 'horse-start horse-start-'+COLORS[startSeat] : ''} ${destination ? 'horse-destination' : ''} ${legalHorse ? 'horse-legal' : ''} ${last ? 'horse-last-to' : ''} ${origin ? 'horse-last-from' : ''}`} aria-label={`Ô đường đua ${square + 1}${horse ? ', '+horseLabel(horse) : ', trống'}${destination ? ', có thể đi tới' : ''}`} onClick={() => destination ? move() : horse && activateHorse(horse.seat, horse.horse)} disabled={!destination && !horse}>{horse ? <Token number={horse.horse + 1}/> : <><span className="horse-direction" aria-hidden="true">{arrow}</span>{entrySeat !== null && game.seats.includes(entrySeat) && <span className="horse-entry-marker" title={`Vào đích ${NAMES[entrySeat]} sau một vòng`} aria-hidden="true">⌂</span>}</>}</button>
    })}
    {Array.from({ length: 4 }, (_, s) => homes[s].map((pos, i) => {
      const h = game.horses[s].findIndex(p => p === 56 + i), active = game.seats.includes(s)
      const destination = seat === s && selectedMove?.to === 56 + i
      const legalHorse = s === seat && h >= 0 && moves.some(m => m.horse === h)
      return <button key={`home-${s}-${i}`} style={placement(pos)} className={`horse-cell horse-home horse-${COLORS[s]} ${active ? '' : 'horse-inactive'} ${destination ? 'horse-destination' : ''} ${legalHorse ? 'horse-legal' : ''} ${isLast(s, 56 + i, 'to') ? 'horse-last-to' : ''} ${isLast(s, 56 + i, 'from') ? 'horse-last-from' : ''}`} aria-label={`Đích ${NAMES[s]} ô ${i + 1}${h >= 0 ? ', ngựa '+(h + 1) : ', trống'}${destination ? ', có thể đi tới' : ''}`} onClick={() => destination ? move() : h >= 0 && activateHorse(s, h)} disabled={!destination && h < 0}>{h >= 0 ? <Token number={h + 1}/> : i + 1}</button>
    }))}
    {Array.from({ length: 4 }, (_, s) => <div key={`stable-${s}`} className={`horse-stable horse-${COLORS[s]} ${game.seats.includes(s) ? '' : 'horse-inactive'}`} style={{ ...placement(stablePositions[s]), gridRowEnd: 'span 5', gridColumnEnd: 'span 5' }}><strong>{game.seats.includes(s) ? NAMES[s] : 'Không chơi'}</strong><div>{game.horses[s].map((p, h) => p === -1 && game.seats.includes(s) ? <button className="horse-cell horse-stable-token" key={h} aria-label={`${NAMES[s]} ngựa ${h + 1} trong chuồng`} aria-pressed={selected === h && s === seat} onClick={() => activateHorse(s, h)}><Token number={h + 1}/></button> : <span className="horse-stable-empty" key={h}/>)}</div></div>)}
  </div>
  const controls = <div className="horse-actions" role="complementary" aria-label="Chọn nước đi"><div className="horse-dice-row"><span aria-label={game.die ? `Xúc xắc ${game.die}` : 'Chưa gieo xúc xắc'} className="horse-die">{game.die ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][game.die - 1] : '—'}</span><button className="play-primary horse-roll" disabled={game.phase !== 'roll'} onClick={roll}>Gieo xúc xắc</button><button aria-label="Undo" disabled={!game.past.length} onClick={() => apply(undo)}>↶</button><button aria-label="Redo" disabled={!game.future.length} onClick={() => apply(redo)}>↷</button></div><div className="horse-options">{game.horses[seat].map((p, horse) => <button key={horse} className={moves.some(m => m.horse === horse) ? 'horse-option-legal' : ''} disabled={game.phase !== 'move'} aria-pressed={selected === horse} onClick={() => activateHorse(seat, horse)}><strong>Ngựa {horse + 1}</strong><small>{locationName(p)}</small></button>)}</div><button className="play-primary horse-move" disabled={!selectedMove} onClick={move}>{selectedMove ? `Đi ngựa ${selected + 1} → ${locationName(selectedMove.to)}` : 'Chọn một ngựa để đi'}</button></div>
  return <><PlayLayout id="co-ca-ngua" title="Cờ cá ngựa" reserve={260} saved={saved} status={<><span className={`horse-turn horse-${COLORS[seat]}`}>{game.winner !== null ? `${NAMES[game.winner]} thắng!` : `Lượt ${NAMES[seat]}`}</span><small className="horse-turn-message">{game.message}</small></>} statusTone={game.winner !== null ? 'play-winner' : ''} board={board} controls={controls} feedback={feedback} tools={<button onClick={() => setConfirmReset(true)}>Ván mới</button>} details={<><p className="horse-last" aria-label="Nước vừa đi">{latest ? `${NAMES[latest.seat]} · ngựa ${latest.horse + 1}: ${locationName(latest.from)} → ${locationName(latest.to)}` : 'Gieo → chọn ngựa → chạm ô sáng hoặc nút Đi.'}</p><details><summary>Luật chơi &amp; ký hiệu</summary><p>Mũi tên chỉ hướng chạy; ký hiệu ⌂ chỉ lối vào đích màu tương ứng sau một vòng. Đường màu có số là đích riêng. Ô nền đậm là xuất phát. Viền vàng là ngựa vừa đi; viền nét đứt là nơi vừa rời. Viền xanh sáng là đích có thể chọn.</p><p>{players} người · Ra chuồng: {startRule === 'six' ? 'chỉ số 6' : '1 hoặc 6'}.</p>{rules}</details></>}/><ConfirmDialog open={confirmReset} title="Bắt đầu ván mới?" confirmLabel="Đồng ý, chọn lại luật" onCancel={() => setConfirmReset(false)} onConfirm={() => { setStored(s => ({ ...s, game: null })); setSelected(null); setFeedback(''); setConfirmReset(false) }}><p>Ván đang chơi, số gieo và lịch sử sẽ được xóa. Chọn lại luật trước khi bắt đầu.</p></ConfirmDialog></>
}
export default { id: 'co-ca-ngua', title: 'Cờ cá ngựa', component: CoCaNgua }
