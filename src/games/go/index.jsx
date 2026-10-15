import React, { useRef, useState } from 'react'
import { createGame, play, pass, resign, undo, redo, toggleDeadGroup, confirmScore, resume, scorePosition } from '../../go/engine.js'
import './go.css'

const names = { black: 'Đen', white: 'Trắng', draw: 'Hòa' }
const coordinate = (index, size) => `${'ABCDEFGHJKLMNOPQRST'[index % size]}${size - Math.floor(index / size)}`
function Go() {
  const [game, setGame] = useState(() => createGame())
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(0)
  const [resigning, setResigning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [nextSize, setNextSize] = useState(9)
  const cells = useRef([])
  const act = operation => {
    const result = operation(game)
    if (result.ok) { setGame(result.state); setError(''); setResigning(false) }
    else setError(result.error)
  }
  const travel = operation => { setGame(operation(game)); setError(''); setResigning(false); setResetting(false) }
  const newGame = () => { setGame(createGame(Number(nextSize))); setError(''); setFocus(0); setResetting(false); setResigning(false) }
  const score = game.phase === 'scoring' ? scorePosition(game) : game.score
  const resultText = game.winner ? game.winner.color === 'draw' ? 'Ván hòa.' : `${names[game.winner.color]} thắng${game.winner.reason === 'resign' ? ' do đối phương đầu hàng.' : ` ${game.winner.margin} điểm.`}` : ''
  const status = game.phase === 'finished' ? resultText : game.phase === 'scoring' ? 'Tính điểm: hai bên đánh dấu quân chết rồi cùng xác nhận.' : `Lượt ${names[game.turn]}${game.passes ? ' · Đối phương vừa bỏ lượt' : ''}`
  const keyboard = (event, index) => {
    const row = Math.floor(index / game.size), col = index % game.size
    const next = { ArrowUp: row > 0 ? index - game.size : index, ArrowDown: row < game.size - 1 ? index + game.size : index, ArrowLeft: col > 0 ? index - 1 : index, ArrowRight: col < game.size - 1 ? index + 1 : index, Home: row * game.size, End: row * game.size + game.size - 1 }[event.key]
    if (next !== undefined) { event.preventDefault(); setFocus(next); cells.current[next]?.focus() }
  }
  return <div className="mg go-game">
    <h1>Cờ vây</h1>
    <p className="go-intro">Hai người cùng thiết bị · Luật diện tích Trung Quốc · Trắng được cộng 7,5 điểm.</p>
    <div className="go-turnbar"><div className="mg-status" role="status" data-testid="go-status">{status}</div>
    <div className="mg-controls">
      <button onClick={() => act(pass)} disabled={game.phase !== 'play'}>Bỏ lượt</button>
      <button onClick={() => travel(undo)} disabled={!game.past.length}>Undo</button>
      <button onClick={() => travel(redo)} disabled={!game.future.length}>Redo</button>
      <button onClick={() => setResigning(!resigning)} disabled={game.phase === 'finished'}>Đầu hàng</button>
    </div>
    {resigning && <div className="mg-panel go-confirm" role="group" aria-label="Xác nhận đầu hàng">
      <p>{game.phase === 'scoring' ? 'Chọn người muốn đầu hàng:' : `${names[game.turn]} xác nhận đầu hàng?`}</p>
      <div className="mg-controls">{(game.phase === 'scoring' ? ['black', 'white'] : [game.turn]).map(color => <button key={color} onClick={() => act(state => resign(state, color))}>{names[color]} xác nhận đầu hàng</button>)}<button onClick={() => setResigning(false)}>Hủy</button></div>
    </div>}
    <div className="mg-error" role="alert">{error}</div></div>
    <div className="mg-layout">
      <section className="mg-panel go-board-panel" aria-label="Khu vực bàn cờ">
        {game.size > 9 && <p className="go-pan-note">Trên màn hình nhỏ, vuốt ngang trong bàn cờ để chọn đúng giao điểm.</p>}
        <div className="go-board-scroll" tabIndex={game.size > 9 ? 0 : undefined} aria-label="Vùng cuộn bàn cờ">
          <div className="go-board" role="grid" aria-label={`Bàn cờ vây ${game.size} × ${game.size}`} aria-rowcount={game.size} aria-colcount={game.size} style={{ '--go-size': game.size }}>
            {Array.from({ length: game.size }, (_, row) => <div role="row" key={row} className="go-row">{game.board.slice(row * game.size, (row + 1) * game.size).map((stone, col) => {
              const index = row * game.size + col, dead = game.dead.includes(index), last = game.lastMove?.type === 'play' && game.lastMove.index === index
              return <div role="gridcell" key={index} className="go-intersection" data-row={row} data-col={col} style={{ '--go-row': row, '--go-col': col }}>
                <button ref={element => { cells.current[index] = element }} className={`mg-cell go-point${stone ? ` go-${stone}` : ''}${dead ? ' go-dead' : ''}${last ? ' go-last' : ''}`} aria-label={`${coordinate(index, game.size)}, ${stone ? names[stone] : 'trống'}${dead ? ', quân chết' : ''}${last ? ', nước vừa đi' : ''}`} data-testid={`go-${row}-${col}`} tabIndex={focus === index ? 0 : -1} aria-disabled={game.phase === 'finished' || (game.phase === 'play' && !!stone)} aria-pressed={game.phase === 'scoring' && stone ? dead : undefined} onFocus={() => setFocus(index)} onKeyDown={event => keyboard(event, index)} onClick={() => { if (game.phase !== 'finished') act(state => game.phase === 'scoring' ? toggleDeadGroup(state, index) : play(state, index)) }}><span className="go-stone"/>{last && <span className="go-last-dot"/>}{dead && <span className="go-dead-cross" aria-hidden="true">×</span>}</button>
              </div>
            })}</div>)}
          </div>
        </div>
        <p className="go-help">Đen đi trước. Chạm giao điểm để đặt quân. Bàn phím: phím mũi tên để chọn, Enter để đặt.</p>
      </section>
      <aside className="mg-panel">
        <h2>Ván {game.size} × {game.size}</h2>
        <p data-testid="go-captures">Đã bắt: Đen {game.captures.black} · Trắng {game.captures.white}</p>
        {game.lastMove?.type === 'play' && <p>Nước vừa đi: {names[game.lastMove.color]} {coordinate(game.lastMove.index, game.size)}</p>}
        {score && <div className="go-score" data-testid="go-score">
          <h3>{game.phase === 'finished' ? 'Điểm đã thống nhất' : 'Điểm tạm tính'}</h3>
          <table><caption>Diện tích + komi</caption><thead><tr><th>Bên</th><th>Quân sống</th><th>Đất</th><th>Tổng</th></tr></thead><tbody>{['black', 'white'].map(color => <tr key={color}><th>{names[color]}</th><td>{score.stones[color]}</td><td>{score.territory[color]}</td><td>{score.totals[color]}</td></tr>)}</tbody></table>
          <p>Trắng: tổng đã cộng 7,5 komi. Điểm trung lập: {score.neutral}. Quân bị bắt không cộng điểm riêng.</p>
        </div>}
        {game.phase === 'scoring' && <div className="go-scoring-controls">
          <p>Cùng xem bàn cờ và chạm nhóm quân để đánh dấu chết (×) hoặc sống. Thay đổi sẽ hủy mọi xác nhận.</p>
          <div className="mg-controls">{['black', 'white'].map(color => <button key={color} disabled={game.agreements[color]} onClick={() => act(state => confirmScore(state, color))}>{names[color]} {game.agreements[color] ? 'đã xác nhận' : 'xác nhận điểm'}</button>)}</div>
          <button onClick={() => act(resume)}>Không đồng ý — chơi tiếp</button>
          <p>Chơi tiếp từ lượt {names[game.turn]}, các dấu quân chết được xóa.</p>
        </div>}
        <div className="go-new-game">
          <label htmlFor="go-size">Cỡ bàn ván mới</label>{' '}<select id="go-size" value={nextSize} onChange={event => setNextSize(event.target.value)}><option value="9">9 × 9</option><option value="13">13 × 13</option><option value="19">19 × 19</option></select>
          <div className="mg-controls"><button onClick={() => game.past.length ? setResetting(true) : newGame()}>Ván mới</button></div>
          {resetting && <div role="group" aria-label="Xác nhận ván mới"><p>Xóa ván hiện tại và lịch sử Undo/Redo?</p><div className="mg-controls"><button onClick={newGame}>Bắt đầu ván mới</button><button onClick={() => setResetting(false)}>Giữ ván hiện tại</button></div></div>}
        </div>
        <details className="mg-rules"><summary>Luật chơi & cách tính điểm</summary><ul>
          <li>Nhóm gồm các quân cùng màu nối ngang/dọc. Khí là giao điểm trống kề nhóm. Nhóm hết khí bị bắt.</li>
          <li>Cấm tự sát, nhưng được đặt quân hết khí ban đầu nếu bắt quân đối phương tạo khí.</li>
          <li>Positional superko: nước đặt quân không được tạo lại bất kỳ bàn cờ trước đó. Bỏ lượt được phép.</li>
          <li>Hai lượt bỏ liên tiếp mở tính điểm, chưa kết thúc ván. Cả hai cùng đánh dấu quân chết và xác nhận. Nếu bất đồng, chơi tiếp để phân định.</li>
          <li>Điểm = quân sống + giao điểm trống chỉ giáp một màu. Vùng giáp hai màu hoặc không giáp màu nào là trung lập. Trong seki, chỉ các vùng giáp hai màu là trung lập theo luật diện tích này. Trắng cộng 7,5.</li>
          <li>Undo/Redo khôi phục cả bắt quân, bỏ lượt, dấu quân chết, xác nhận và kết quả. Thao tác mới sau Undo xóa nhánh Redo.</li>
        </ul></details>
      </aside>
    </div>
  </div>
}

export default { id: 'go', title: 'Cờ vây', component: Go }
