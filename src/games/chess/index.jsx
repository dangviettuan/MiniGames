import React, { useMemo, useState } from 'react'
import { initialState, legalMoves, makeMove, makeMoveAndClaim, inCheck, algebraic, color, resign, drawClaims, claimDraw } from '../../chess/engine.js'
import './style.css'

const glyphs = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' }
const names = { k:'Vua',q:'Hậu',r:'Xe',b:'Tượng',n:'Mã',p:'Tốt' }
const sideName = side => side === 'w' ? 'Trắng' : 'Đen'
const reasonNames = { checkmate:'chiếu hết',stalemate:'hết nước đi hợp lệ',resignation:'đầu hàng','resignation-no-mating-material':'đầu hàng khi đối phương chỉ còn vua, không thể chiếu hết','insufficient-material':'không đủ quân để chiếu hết',repetition:'lặp vị trí 3 lần','fivefold-repetition':'lặp vị trí 5 lần','fifty-move':'50 nước không bắt quân hoặc đi tốt','seventy-five-move':'75 nước không bắt quân hoặc đi tốt' }
function Chess() {
  const [timeline,setTimeline] = useState(() => [initialState()]), [cursor,setCursor] = useState(0)
  const [selected,setSelected] = useState(null), [error,setError] = useState(''), [promotion,setPromotion] = useState(null), [flipped,setFlipped] = useState(false), [confirmResign,setConfirmResign] = useState(false)
  const [claimOnMove,setClaimOnMove] = useState(false)
  const state = timeline[cursor], moves = useMemo(() => legalMoves(state),[state]), claims = useMemo(() => drawClaims(state),[state])
  const selectedMoves = moves.filter(m => m.from === selected), targets = new Set(selectedMoves.map(m => m.to))
  const clear = () => { setSelected(null);setPromotion(null);setError('');setConfirmResign(false) }
  const commit = next => { setTimeline([...timeline.slice(0,cursor+1),next]);setCursor(cursor+1);clear() }
  const move = input => { try { commit((claimOnMove ? makeMoveAndClaim : makeMove)(state,input)) } catch (e) { setError(e.message) } }
  const chooseSquare = index => {
    if (state.result || promotion) return
    setConfirmResign(false)
    if (selected === index) { setSelected(null);setError('');return }
    if (color(state.board[index]) === state.turn) { setSelected(index);setError('');return }
    const options = selectedMoves.filter(m => m.to === index)
    if (options.length > 1) { setPromotion({from:selected,to:index});setError('');return }
    if (options.length === 1) { move(options[0]);return }
    setError(selected === null ? `Chọn một quân ${sideName(state.turn)} để bắt đầu.` : 'Nước đi không hợp lệ. Chọn ô có dấu chấm hoặc quân khác.')
  }
  const result = state.result
  const status = result ? (result.winner ? `${sideName(result.winner)} thắng — ${reasonNames[result.reason]}.` : `Hòa — ${reasonNames[result.reason]}.`) : `Lượt ${sideName(state.turn)}${inCheck(state) ? ' — đang bị chiếu!' : ''}`
  const indices = Array.from({length:64},(_,i) => flipped ? 63-i : i)
  return <section className="mg chess-game" aria-labelledby="chess-title">
    <h1 id="chess-title">Cờ vua</h1>
    <p className="chess-intro">Hai người cùng thiết bị · Chọn quân, rồi chọn ô được đánh dấu.</p>
    <div className="mg-layout">
      <div className="mg-panel">
        <div className={'mg-status '+(result ? 'chess-ended':'')} role="status" aria-live="polite">{status}</div>
        <div className="mg-board chess-board" role="grid" aria-label="Bàn cờ vua">
          {indices.map((i,displayIndex) => { const p = state.board[i], label = `${algebraic(i)}, ${p ? sideName(color(p))+' '+names[p.toLowerCase()] : 'trống'}${targets.has(i) ? ', có thể đi tới':''}`
            return <button key={i} type="button" className={'mg-cell chess-square '+((Math.floor(i/8)+i%8)%2 ? 'chess-dark':'chess-light')+(selected === i ? ' chess-selected':'')+(state.lastMove && [state.lastMove.from,state.lastMove.to].includes(i) ? ' chess-last':'')+(p?.toLowerCase() === 'k' && color(p) === state.turn && inCheck(state) ? ' chess-check':'')} data-square={algebraic(i)} aria-label={label} aria-pressed={selected === i} onClick={() => chooseSquare(i)} disabled={Boolean(result || promotion)}>
              {displayIndex%8 === 0 && <span className="chess-rank" aria-hidden="true">{8-Math.floor(i/8)}</span>}
              {displayIndex >= 56 && <span className="chess-file" aria-hidden="true">{'abcdefgh'[i%8]}</span>}
              {p && <span aria-hidden="true" className={'chess-piece '+(color(p) === 'w' ? 'chess-white-piece':'chess-black-piece')}>{glyphs[p]}</span>}
              {targets.has(i) && <span className={'chess-target '+(p ? 'chess-capture':'')} aria-hidden="true"/>}
            </button>
          })}
        </div>
        {promotion && <div className="chess-promotion" role="group" aria-label="Chọn quân phong cấp"><strong>Phong cấp tốt thành:</strong><div className="mg-controls">{['q','r','b','n'].map(p => <button key={p} autoFocus={p === 'q'} onClick={() => move({...promotion,promotion:p})}>{names[p]}</button>)}<button onClick={() => {setPromotion(null);setError('')}}>Hủy phong cấp</button></div></div>}
        <div className="mg-controls" aria-label="Điều khiển ván cờ">
          <button disabled={cursor === 0} onClick={() => {setCursor(cursor-1);clear()}}>Undo</button>
          <button disabled={cursor === timeline.length-1} onClick={() => {setCursor(cursor+1);clear()}}>Redo</button>
          <button onClick={() => {setTimeline([initialState()]);setCursor(0);clear()}}>Ván mới</button>
          <button onClick={() => setFlipped(!flipped)}>Xoay bàn</button>
          <button disabled={Boolean(result || promotion)} onClick={() => {setConfirmResign(!confirmResign);setError('')}}>Đầu hàng</button>
          {claims.length > 0 && <button onClick={() => commit(claimDraw(state))}>Yêu cầu hòa</button>}
        </div>
        {confirmResign && <div className="chess-confirm"><span>{sideName(state.turn)} muốn đầu hàng?</span><button onClick={() => commit(resign(state))}>Xác nhận đầu hàng</button><button onClick={() => setConfirmResign(false)}>Tiếp tục chơi</button></div>}
        <label className="chess-claim"><input type="checkbox" checked={claimOnMove} disabled={Boolean(result)} onChange={e => setClaimOnMove(e.target.checked)}/> Yêu cầu hòa nếu nước tiếp theo đủ điều kiện</label>
        <div className="mg-error" role="alert">{error}</div>
        <div className="chess-selection" aria-live="polite">{selected !== null ? `${sideName(state.turn)} ${names[state.board[selected].toLowerCase()]} tại ${algebraic(selected)} · ${targets.size} ô hợp lệ` : 'Các ô có dấu chấm là nước đi hợp lệ.'}</div>
      </div>
      <aside className="mg-panel">
        <h2>Lịch sử ván cờ</h2>
        <p>{cursor} thao tác · {Math.min(Math.floor(cursor/2)+1,state.fullmove)} lượt</p>
        <ol className="mg-history chess-history" aria-label="Lịch sử nước đi">{timeline.slice(1,cursor+1).map((s,i) => <li key={i}>{s.result?.reason.startsWith('resignation') ? `${sideName(s.turn)} đầu hàng` : ['repetition','fifty-move'].includes(s.result?.reason) && s.lastMove === timeline[i].lastMove ? 'Yêu cầu hòa' : `${sideName(timeline[i].turn)}: ${algebraic(s.lastMove.from)} → ${algebraic(s.lastMove.to)}${s.lastMove.promotion ? ' = '+names[s.lastMove.promotion] : ''}${s.lastMove.castle ? ' (nhập thành)' : ''}${s.lastMove.enPassant ? ' (bắt tốt qua đường)' : ''}`}</li>)}</ol>
        <details className="mg-rules" open><summary>Luật và cách chơi</summary><p>Trắng đi trước. Không được để vua bị chiếu. Nhập thành bằng cách chọn vua rồi chọn c1/g1 hoặc c8/g8; đường đi phải an toàn, vua và xe chưa từng di chuyển.</p><p>Tốt được đi 2 ô từ vị trí đầu; bắt qua đường chỉ ngay sau nước tốt đi 2 ô. Đến hàng cuối, chọn Hậu, Xe, Tượng hoặc Mã.</p><p>Chiếu hết là thắng. Hết nước hợp lệ khi không bị chiếu hoặc không đủ quân chiếu hết là hòa. Có thể yêu cầu hòa khi vị trí lặp 3 lần hoặc đủ 50 nước mỗi bên không bắt quân/đi tốt. Tự hòa tại 5 lần hoặc 75 nước; chiếu hết được ưu tiên.</p><p>Undo/Redo dùng được cả sau khi ván kết thúc. Đi nước mới sau Undo sẽ bỏ các nước tương lai. Chưa có đồng hồ, AI hoặc chơi mạng.</p></details>
      </aside>
    </div>
  </section>
}
export default { id:'chess',title:'Cờ vua',component:Chess }
