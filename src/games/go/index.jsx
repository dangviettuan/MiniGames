import React, { useEffect, useRef, useState } from 'react'
import { createGame, play, pass, resign, undo, redo, toggleDeadGroup, confirmScore, resume, scorePosition } from '../../go/engine.js'
import { PlayLayout, ConfirmDialog } from '../../shared/PlayLayout.jsx'
import { useStoredGame } from '../../shared/useStoredGame.js'
import { validateSavedGo, goStorageCodec } from './storage.js'
import './go.css'

const names = { black: 'Đen', white: 'Trắng', draw: 'Hòa' }
const letters = 'ABCDEFGHJKLMNOPQRST'
const coordinate = (index, size) => `${letters[index % size]}${size - Math.floor(index / size)}`
const describe = (move, size) => !move ? 'Bắt đầu ván' : ({ play: `${names[move.color]} ${coordinate(move.index, size)}${move.captured ? ` · bắt ${move.captured}` : ''}`, pass: `${names[move.color]} bỏ lượt`, mark: 'Thay đổi nhóm quân chết', confirm: `${names[move.color]} xác nhận điểm`, resume: 'Tiếp tục chơi', resign: `${names[move.color]} đầu hàng` })[move.type]

function Go() {
  const [game, setGame, saved] = useStoredGame('go', () => createGame(), validateSavedGo, goStorageCodec)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [focus, setFocus] = useState(0)
  const [resigning, setResigning] = useState(false)
  const [resignColor, setResignColor] = useState(game.turn)
  const [resetting, setResetting] = useState(false)
  const [nextSize, setNextSize] = useState(game.size)
  const [zoom, setZoom] = useState(false)
  const [boardWidth, setBoardWidth] = useState(0)
  const [viewRange, setViewRange] = useState('')
  const cells = useRef([]), windowRef = useRef(null)
  useEffect(() => {
    const observer = new ResizeObserver(entries => setBoardWidth(entries[0].contentRect.width))
    if (windowRef.current) observer.observe(windowRef.current)
    return () => observer.disconnect()
  }, [])
  const needsZoom = !zoom && boardWidth > 0 && (boardWidth - 32) / game.size < 31.9
  const closeTools = () => document.querySelector('.play-go .play-tools')?.removeAttribute('open')
  const act = operation => {
    const result = operation(game)
    if (result.ok) { setGame(result.state); setError(''); setResigning(false) }
    else { setError(result.error.includes('Superko') ? 'Thế cờ này đã xuất hiện. Hãy chọn một nước khác; không được lặp lại thế cờ cũ (luật ko).' : result.error.includes('tự sát') ? 'Nhóm quân ở đây sẽ hết khí và không bắt được quân nào. Hãy chọn giao điểm khác.' : result.error); setNotice('') }
  }
  const travel = operation => { setGame(operation(game)); setError(''); setNotice(''); setResigning(false); setResetting(false) }
  const newGame = () => { setGame(createGame(Number(nextSize))); setError(''); setNotice(''); setFocus(0); setZoom(false); setResetting(false); setResigning(false); closeTools() }
  const score = game.phase === 'scoring' ? scorePosition(game) : game.score
  const resultText = game.winner ? game.winner.color === 'draw' ? 'Ván hòa.' : `${names[game.winner.color]} thắng${game.winner.reason === 'resign' ? ' do đối phương đầu hàng.' : ` ${game.winner.margin} điểm.`}` : ''
  const status = game.phase === 'finished' ? resultText : game.phase === 'scoring' ? 'Tính điểm · Chọn nhóm quân chết, rồi cả hai xác nhận.' : `Lượt ${names[game.turn]}${game.passes ? ' · Đối phương vừa bỏ lượt' : ''}`
  const keyboard = (event, index) => {
    const row = Math.floor(index / game.size), col = index % game.size
    const next = { ArrowUp: row > 0 ? index - game.size : index, ArrowDown: row < game.size - 1 ? index + game.size : index, ArrowLeft: col > 0 ? index - 1 : index, ArrowRight: col < game.size - 1 ? index + 1 : index, Home: row * game.size, End: row * game.size + game.size - 1 }[event.key]
    if (next !== undefined) { event.preventDefault(); setFocus(next); cells.current[next]?.focus() }
  }
  const star = (row, col) => {
    const points = game.size === 9 ? [2, 4, 6] : game.size === 13 ? [3, 6, 9] : [3, 9, 15]
    return points.includes(row) && points.includes(col) && (game.size === 19 || row !== points[1] && col !== points[1] || row === points[1] && col === points[1])
  }
  const board = <div className="go-surface">
    <div ref={windowRef} onScroll={event => {
      const element = event.currentTarget, step = (element.firstElementChild.clientWidth - 32) / game.size
      const col = Math.max(0, Math.floor((element.scrollLeft - 16) / step)), row = Math.max(0, Math.floor((element.scrollTop - 16) / step))
      const lastCol = Math.min(game.size - 1, Math.floor((element.scrollLeft + element.clientWidth - 16) / step)), lastRow = Math.min(game.size - 1, Math.floor((element.scrollTop + element.clientHeight - 16) / step))
      setViewRange(`${letters[col]}–${letters[lastCol]} / ${game.size - row}–${game.size - lastRow}`)
    }} className={`go-window${zoom ? ' go-zoomed' : ''}`} aria-label={zoom ? 'Bàn phóng to, vuốt để di chuyển' : 'Toàn bàn cờ'}>
      <div className="go-board" role="grid" aria-label={`Bàn cờ vây ${game.size} × ${game.size}`} aria-rowcount={game.size} aria-colcount={game.size} style={{ '--go-size': game.size, width: zoom ? `max(100%, ${game.size * 36 + 32}px)` : '100%' }}>
        <div className="go-column-labels" aria-hidden="true">{Array.from({ length: game.size }, (_, col) => <span key={col}>{letters[col]}</span>)}</div>
        <div className="go-row-labels" aria-hidden="true">{Array.from({ length: game.size }, (_, row) => <span key={row}>{game.size - row}</span>)}</div>
        {Array.from({ length: game.size }, (_, row) => <div role="row" key={row} className="go-row">{game.board.slice(row * game.size, (row + 1) * game.size).map((stone, col) => {
          const index = row * game.size + col, dead = game.dead.includes(index), last = game.lastMove?.type === 'play' && game.lastMove.index === index
          return <div role="gridcell" key={index} className={`go-intersection${star(row, col) ? ' go-star' : ''}`} data-row={row} data-col={col}>
            <button ref={element => { cells.current[index] = element }} className={`mg-cell go-point${stone ? ` go-${stone}` : ''}${dead ? ' go-dead' : ''}${last ? ' go-last' : ''}`} aria-label={`${coordinate(index, game.size)}, ${stone ? names[stone] : 'trống'}${dead ? ', quân chết' : ''}${last ? ', nước vừa đi' : ''}`} data-testid={`go-${row}-${col}`} tabIndex={focus === index ? 0 : -1} disabled={needsZoom || game.phase === 'finished'} aria-disabled={needsZoom || game.phase === 'finished' || (game.phase === 'play' && !!stone)} aria-pressed={game.phase === 'scoring' && stone ? dead : undefined} onFocus={() => setFocus(index)} onKeyDown={event => keyboard(event, index)} onClick={() => {
              setNotice(game.phase === 'scoring' && (game.agreements.black || game.agreements.white) ? 'Đã thay đổi quân chết. Cả hai cần xác nhận lại.' : '')
              act(state => game.phase === 'scoring' ? toggleDeadGroup(state, index) : play(state, index))
            }}><span className="go-stone"/>{last && <span className="go-last-dot"/>}{dead && <span className="go-dead-cross" aria-hidden="true">×</span>}</button>
          </div>
        })}</div>)}
      </div>
    </div>
    {needsZoom && game.phase !== 'finished' && <button className="go-zoom-prompt play-primary" onClick={() => setZoom(true)}>Phóng to để chọn giao điểm</button>}
  </div>
  const controls = <div className="go-actions">
    {score && <div className="go-score" data-testid="go-score"><strong>Đen {score.totals.black}</strong><span>Trắng {score.totals.white} <small>(+7,5)</small></span></div>}
    {game.phase === 'scoring' ? <>
      <div className="go-confirm-points">{['black', 'white'].map(side => <button className={game.agreements[side] ? '' : 'play-primary'} key={side} disabled={game.agreements[side]} onClick={() => { setNotice(''); act(state => confirmScore(state, side)) }}>{names[side]} {game.agreements[side] ? 'đã xác nhận' : 'xác nhận điểm'}</button>)}</div>
      <div className="go-control-row"><button onClick={() => { setNotice(''); act(resume) }}>Chơi tiếp</button><button aria-label="Undo" onClick={() => travel(undo)} disabled={!game.past.length}>↶ Đi lại</button><button aria-label="Redo" onClick={() => travel(redo)} disabled={!game.future.length}>↷ Đi tiếp</button></div>
    </> : <div className="go-control-row"><button className="play-primary" onClick={() => act(pass)} disabled={game.phase !== 'play'}>Bỏ lượt</button><button aria-label="Undo" onClick={() => travel(undo)} disabled={!game.past.length}>↶ Đi lại</button><button aria-label="Redo" onClick={() => travel(redo)} disabled={!game.future.length}>↷ Đi tiếp</button></div>}
    <div className="go-view-row"><span>{game.size} × {game.size}{zoom ? ` · ${viewRange || 'Vuốt để xem'}` : needsZoom ? ' · Chỉ xem toàn bàn' : ''}</span><button aria-pressed={zoom} onClick={() => { setZoom(!zoom); setError('') }}>{zoom ? 'Toàn bàn' : 'Phóng to'}</button></div>
    {notice && <p className="go-notice" role="note">{notice}</p>}
  </div>
  const tools = <><label htmlFor="go-size">Cỡ bàn ván mới</label><select id="go-size" value={nextSize} onChange={event => setNextSize(Number(event.target.value))}><option value="9">9 × 9</option><option value="13">13 × 13</option><option value="19">19 × 19</option></select><button onClick={() => { game.past.length || game.future.length ? setResetting(true) : newGame() }}>Ván mới</button>{game.phase === 'scoring' && <><label htmlFor="go-resign-side">Người đầu hàng</label><select id="go-resign-side" value={resignColor} onChange={event => setResignColor(event.target.value)}><option value="black">Đen</option><option value="white">Trắng</option></select></>}<button disabled={game.phase === 'finished'} onClick={() => { if (game.phase !== 'scoring') setResignColor(game.turn); setResigning(true) }}>Đầu hàng</button></>
  const history = [...game.past, game].filter(position => position.lastMove)
  const details = <>
    <details><summary>Thông tin ván & lịch sử ({history.length})</summary><p data-testid="go-captures">Đã bắt: Đen {game.captures.black} · Trắng {game.captures.white}</p><p>Luật diện tích Trung Quốc · Trắng được cộng 7,5 điểm. Hai người cùng thiết bị. Ván tự lưu trên thiết bị này.</p>{score && <p>Quân sống: Đen {score.stones.black}, Trắng {score.stones.white}. Đất: Đen {score.territory.black}, Trắng {score.territory.white}. Trung lập: {score.neutral}.</p>}<ol>{history.slice(-20).map((position, index) => <li key={index}>{describe(position.lastMove, game.size)}</li>)}</ol></details>
    <details><summary>Luật chơi & cách tính điểm</summary><ul><li>Nhóm nối ngang/dọc. Nhóm hết khí bị bắt. Không được đặt quân tự hết khí trừ khi bắt quân đối phương để có khí.</li><li>Không được tạo lại thế cờ đã xuất hiện (ko). Có thể đi chỗ khác hoặc bỏ lượt.</li><li>Hai lượt bỏ liên tiếp mở tính điểm. Chạm nhóm để đánh dấu chết (×) hoặc sống. Thay đổi quân chết hủy xác nhận của cả hai. Nếu bất đồng, chọn Chơi tiếp.</li><li>Điểm = quân sống + giao điểm trống chỉ giáp một màu; vùng giáp hai màu hoặc không giáp màu nào là trung lập. Quân bị bắt không cộng điểm riêng. Trắng cộng 7,5.</li><li>Hai bên cùng xác nhận mới kết thúc ván. Undo/Redo khôi phục cả điểm, xác nhận và kết quả. Thao tác mới sau Undo thay thế phần lịch sử phía sau.</li><li>Phím mũi tên di chuyển, Enter/Space chọn giao điểm. Bàn phóng to giữ giao điểm lớn và vuốt được theo cả hai chiều.</li></ul></details>
  </>
  return <><PlayLayout id="go" title="Cờ vây" status={<span data-testid="go-status">{status}</span>} board={board} controls={controls} feedback={error} details={details} tools={tools} saved={saved} reserve={game.phase === 'scoring' ? 340 : 260} minBoard={200}/>
    <ConfirmDialog open={resetting} title="Bắt đầu ván cờ vây mới?" confirmLabel="Bắt đầu ván mới" cancelLabel="Giữ ván hiện tại" onConfirm={newGame} onCancel={() => setResetting(false)}><p>Ván {game.size} × {game.size} và toàn bộ lịch sử sẽ được thay bằng ván {nextSize} × {nextSize}.</p></ConfirmDialog>
    <ConfirmDialog open={resigning} title={`${names[resignColor]} xác nhận đầu hàng?`} confirmLabel={`${names[resignColor]} xác nhận đầu hàng`} cancelLabel="Tiếp tục chơi" onConfirm={() => { closeTools(); act(state => resign(state, resignColor)) }} onCancel={() => setResigning(false)}><p>{names[resignColor === 'black' ? 'white' : 'black']} sẽ thắng ván này.</p></ConfirmDialog>
  </>
}

export default { id: 'go', title: 'Cờ vây', component: Go }
