import React, { useMemo, useState } from 'react'
import { legalMoves, makeMove, makeMoveAndClaim, inCheck, algebraic, color, resign, drawClaims, claimDraw } from '../../chess/engine.js'
import { PlayLayout, ConfirmDialog } from '../../shared/PlayLayout.jsx'
import { useStoredGame } from '../../shared/useStoredGame.js'
import { createStoredChess, validateStoredChess, encodeStoredChess, decodeStoredChess } from './state.js'
import './style.css'

const glyphs = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' }
const names = { k:'Vua',q:'Hậu',r:'Xe',b:'Tượng',n:'Mã',p:'Tốt' }
const sideName = side => side === 'w' ? 'Trắng' : 'Đen'
const reasonNames = { checkmate:'chiếu hết',stalemate:'hết nước đi hợp lệ',resignation:'đầu hàng','resignation-no-mating-material':'đầu hàng khi đối phương chỉ còn vua, không thể chiếu hết','insufficient-material':'không đủ quân để chiếu hết',repetition:'lặp vị trí 3 lần','fivefold-repetition':'lặp vị trí 5 lần','fifty-move':'50 nước không bắt quân hoặc đi tốt','seventy-five-move':'75 nước không bắt quân hoặc đi tốt' }
function Chess() {
  const [stored,setStored,saved] = useStoredGame('chess',createStoredChess,validateStoredChess,{encode:encodeStoredChess,decode:decodeStoredChess})
  const {timeline,cursor,flipped,claimOnMove} = stored
  const [selected,setSelected] = useState(null), [error,setError] = useState(''), [promotion,setPromotion] = useState(null), [confirm,setConfirm] = useState(null)
  const state = timeline[cursor], moves = useMemo(() => legalMoves(state),[state]), claims = useMemo(() => drawClaims(state),[state])
  const selectedMoves = moves.filter(m => m.from === selected), targets = new Set(selectedMoves.map(m => m.to))
  const clear = () => {setSelected(null);setPromotion(null);setError('');setConfirm(null)}
  const commit = next => {setStored({...stored,timeline:[...timeline.slice(0,cursor+1),next],cursor:cursor+1});clear()}
  const move = input => {try {commit((claimOnMove ? makeMoveAndClaim : makeMove)(state,input))} catch(e) {setError(e.message)}}
  const chooseSquare = index => {
    if (state.result || promotion) return
    if (selected === index) {setSelected(null);setError('');return}
    if (color(state.board[index]) === state.turn) {setSelected(index);setError('');return}
    const options = selectedMoves.filter(m => m.to === index)
    if (options.length > 1) {setPromotion({from:selected,to:index});setError('');return}
    if (options.length === 1) {move(options[0]);return}
    setError(selected === null ? `Chọn một quân ${sideName(state.turn)} để bắt đầu.` : 'Nước đi không hợp lệ. Chọn ô có dấu chấm hoặc quân khác.')
  }
  const openConfirm = type => {const menu=document.querySelector('.play-chess .play-tools');menu?.removeAttribute('open');menu?.querySelector('summary')?.focus();setConfirm(type)}
  const result = state.result
  const status = result ? (result.winner ? `${sideName(result.winner)} thắng — ${reasonNames[result.reason]}.` : `Hòa — ${reasonNames[result.reason]}.`) : `Lượt ${sideName(state.turn)}${inCheck(state) ? ' — đang bị chiếu!' : ''}`
  const indices = Array.from({length:64},(_,i) => flipped ? 63-i : i)
  const board = <div className="chess-board" role="grid" aria-label="Bàn cờ vua">
    {indices.map((i,displayIndex) => {const p=state.board[i], label=`${algebraic(i)}, ${p ? sideName(color(p))+' '+names[p.toLowerCase()] : 'trống'}${targets.has(i) ? ', có thể đi tới':''}`
      return <button key={i} type="button" className={'chess-square '+((Math.floor(i/8)+i%8)%2 ? 'chess-dark':'chess-light')+(selected===i ? ' chess-selected':'')+(state.lastMove && [state.lastMove.from,state.lastMove.to].includes(i) ? ' chess-last':'')+(p?.toLowerCase()==='k' && color(p)===state.turn && inCheck(state) ? ' chess-check':'')} data-square={algebraic(i)} aria-label={label} aria-pressed={selected===i} onClick={() => chooseSquare(i)} disabled={Boolean(result || promotion)}>
        {displayIndex%8===0 && <span className="chess-rank" aria-hidden="true">{8-Math.floor(i/8)}</span>}
        {displayIndex>=56 && <span className="chess-file" aria-hidden="true">{'abcdefgh'[i%8]}</span>}
        {p && <span aria-hidden="true" className={'chess-piece '+(color(p)==='w' ? 'chess-white-piece':'chess-black-piece')}>{glyphs[p]}</span>}
        {targets.has(i) && <span className={'chess-target '+(p ? 'chess-capture':'')} aria-hidden="true"/>}
      </button>
    })}
  </div>
  const controls = <>
    <button aria-label="Undo" disabled={cursor===0} onClick={() => {setStored({...stored,cursor:cursor-1});clear()}}>↶ Đi lại</button>
    <button aria-label="Redo" disabled={cursor===timeline.length-1} onClick={() => {setStored({...stored,cursor:cursor+1});clear()}}>↷ Đi tiếp</button>
    {claims.length>0 && <button className="play-primary" onClick={() => commit(claimDraw(state))}>Yêu cầu hòa</button>}
    {promotion && <div className="chess-promotion" role="group" aria-label="Chọn quân phong cấp"><strong>Phong cấp tốt thành:</strong><div className="chess-promotion-actions">{['q','r','b','n'].map(p => <button key={p} autoFocus={p==='q'} onClick={() => move({...promotion,promotion:p})}>{names[p]}</button>)}<button onClick={() => {setPromotion(null);setError('')}}>Hủy phong cấp</button></div></div>}
    <p className="play-hint chess-selection" aria-live="polite">{selected!==null ? `${sideName(state.turn)} ${names[state.board[selected].toLowerCase()]} tại ${algebraic(selected)} · ${targets.size} ô hợp lệ` : 'Chọn quân, rồi chọn ô có dấu chấm.'}</p>
  </>
  const tools = <>
    <button onClick={() => openConfirm('new')}>Ván mới</button>
    <button onClick={() => setStored({...stored,flipped:!flipped})}>Xoay bàn</button>
    <button disabled={Boolean(result || promotion)} onClick={() => openConfirm('resign')}>Đầu hàng</button>
    <label className="chess-claim"><input type="checkbox" checked={claimOnMove} disabled={Boolean(result)} onChange={e => setStored({...stored,claimOnMove:e.target.checked})}/> Yêu cầu hòa nếu nước tiếp theo đủ điều kiện</label>
  </>
  const details = <>
    <details><summary>Lịch sử ván cờ · {cursor} thao tác</summary><ol className="chess-history" aria-label="Lịch sử nước đi">{timeline.slice(1,cursor+1).map((s,i) => <li key={i}>{s.result?.reason.startsWith('resignation') ? `${sideName(s.turn)} đầu hàng` : ['repetition','fifty-move'].includes(s.result?.reason) && JSON.stringify(s.board)===JSON.stringify(timeline[i].board) ? 'Yêu cầu hòa' : `${sideName(timeline[i].turn)}: ${algebraic(s.lastMove.from)} → ${algebraic(s.lastMove.to)}${s.lastMove.promotion ? ' = '+names[s.lastMove.promotion] : ''}${s.lastMove.castle ? ' (nhập thành)' : ''}${s.lastMove.enPassant ? ' (bắt tốt qua đường)' : ''}`}</li>)}</ol></details>
    <details><summary>Luật và cách chơi</summary><p>Hai người cùng thiết bị. Trắng đi trước. Không được để vua bị chiếu. Nhập thành bằng cách chọn vua rồi chọn c1/g1 hoặc c8/g8; đường đi phải an toàn, vua và xe chưa từng di chuyển.</p><p>Tốt được đi 2 ô từ vị trí đầu; bắt qua đường chỉ ngay sau nước tốt đi 2 ô. Đến hàng cuối, chọn Hậu, Xe, Tượng hoặc Mã.</p><p>Chiếu hết là thắng. Hết nước hợp lệ khi không bị chiếu hoặc không đủ quân chiếu hết là hòa. Có thể yêu cầu hòa khi vị trí lặp 3 lần hoặc đủ 50 nước mỗi bên không bắt quân/đi tốt. Tự hòa tại 5 lần hoặc 75 nước; chiếu hết được ưu tiên.</p><p>Đi lại/Đi tiếp dùng được cả sau khi ván kết thúc. Đi nước mới sau Đi lại sẽ bỏ các nước tương lai. Ván và lịch sử được lưu tự động trên thiết bị. Chưa có đồng hồ, AI hoặc chơi mạng.</p></details>
  </>
  return <><PlayLayout id="chess" title="Cờ vua" status={status} statusTone={result ? 'chess-ended':''} board={board} controls={controls} tools={tools} feedback={error} details={details} saved={saved}/>
    <ConfirmDialog open={Boolean(confirm)} title={confirm==='resign' ? `${sideName(state.turn)} muốn đầu hàng?` : 'Tạo ván mới?'} confirmLabel={confirm==='resign' ? 'Xác nhận đầu hàng' : 'Tạo ván mới'} cancelLabel={confirm==='resign' ? 'Tiếp tục chơi' : 'Tiếp tục ván này'} onCancel={() => setConfirm(null)} onConfirm={() => {if(confirm==='resign') commit(resign(state));else {setStored(createStoredChess());clear()}}}>{confirm==='resign' ? <p>Ván sẽ kết thúc. Bạn vẫn có thể dùng Đi lại để trở về trước khi đầu hàng.</p> : undefined}</ConfirmDialog>
  </>
}
export default {id:'chess',title:'Cờ vua',component:Chess}
