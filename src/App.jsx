import React, { useMemo, useState } from 'react'
import { PlayLayout, ConfirmDialog } from './shared/PlayLayout.jsx'
import { useStoredGame } from './shared/useStoredGame.js'
import { NAMES, label, inCheck, legalMoves, playMove } from './xiangqi/engine.js'
import { initialGame, validStoredGame, position } from './xiangqi/state.js'
import './xiangqi/style.css'

const END_REASONS = { capture: 'Ăn tướng', checkmate: 'Chiếu bí', stalemate: 'Hết nước hợp lệ' }
const PIECE_NAMES = { general: 'Tướng', advisor: 'Sĩ', elephant: 'Tượng', horse: 'Mã', rook: 'Xe', cannon: 'Pháo', soldier: 'Tốt' }
const sameSquare = (a,b) => a && b && a[0]===b[0] && a[1]===b[1]

export default function App() {
  const [game,setGame,saved]=useStoredGame('xiangqi',initialGame,validStoredGame)
  const [pick,setPick]=useState(null), [feedback,setFeedback]=useState(''), [confirm,setConfirm]=useState(false)
  const {board,turn,winner,reason,timeline,cursor,flipped,coordinates}=game
  const moves=useMemo(()=>pick && !winner ? legalMoves(board,pick) : [],[board,pick,winner])
  const moveSet=new Set(moves.map(([r,c])=>`${r}-${c}`))
  const checked=!winner && inCheck(board,turn)
  const last=cursor ? timeline[cursor-1] : null
  const selected=pick && board[pick[0]][pick[1]]
  function navigate(delta) {
    const target=cursor+delta
    if(target<0 || target>timeline.length) return
    const restored=delta<0 ? timeline[cursor-1].before : timeline[cursor].after
    setGame({...game,...restored,cursor:target});setPick(null);setFeedback('')
  }
  function clickCell(r,c) {
    if(winner) return
    const piece=board[r][c]
    if(piece?.side===turn) {setPick(sameSquare(pick,[r,c])?null:[r,c]);setFeedback('');return}
    if(!pick) {setFeedback(piece ? `Đến lượt ${NAMES[turn]}. Hãy chọn quân của mình.` : 'Hãy chọn quân của mình trước.');return}
    const [sr,sc]=pick, result=playMove(board,turn,pick,[r,c])
    if(!result) {setFeedback('Nước đi không hợp lệ. Chọn ô có dấu chấm hoặc vòng tròn; không được để tướng bị chiếu.');return}
    const moving=board[sr][sc], captured=board[r][c]
    const description=`${NAMES[turn]}: ${PIECE_NAMES[moving.type]} ${sr+1},${sc+1} → ${r+1},${c+1}${captured?` ăn ${PIECE_NAMES[captured.type]}`:''}`
    setGame({...game,...result,timeline:[...timeline.slice(0,cursor),{before:position(game),after:result,from:[sr,sc],to:[r,c],description}],cursor:cursor+1})
    setPick(null);setFeedback('')
  }
  function reset(){setGame(initialGame());setPick(null);setFeedback('');setConfirm(false)}
  const cells=Array.from({length:90},(_,index)=>flipped ? 89-index : index)
  const boardView=<div className="xq-board" role="grid" aria-label="Bàn cờ tướng" data-flipped={flipped}>
    <svg className="xq-lines" viewBox="0 0 900 1000" preserveAspectRatio="none" aria-hidden="true"><g stroke="#886240" strokeWidth="2.3" fill="none">{Array.from({length:10},(_,r)=><line key={`h${r}`} x1="50" y1={50+r*100} x2="850" y2={50+r*100}/>)}{Array.from({length:9},(_,c)=><React.Fragment key={`v${c}`}><line x1={50+c*100} y1="50" x2={50+c*100} y2="450"/><line x1={50+c*100} y1="550" x2={50+c*100} y2="950"/></React.Fragment>)}<path d="M350 50 L550 250 M550 50 L350 250 M350 750 L550 950 M550 750 L350 950"/></g><text x="450" y="512" textAnchor="middle" fontSize="30" fill="#886240">SỞ HÀ　•　HÁN GIỚI</text></svg>
    {cells.map(index=>{
      const r=Math.floor(index/9),c=index%9,piece=board[r][c],chosen=sameSquare(pick,[r,c]),canMove=moveSet.has(`${r}-${c}`),origin=sameSquare(last?.from,[r,c]),destination=sameSquare(last?.to,[r,c])
      return <button key={`${r}-${c}`} type="button" className={`cell xq-cell${chosen?' xq-selected':''}${origin?' xq-last-origin':''}${destination?' xq-last-destination':''}${canMove&&piece?' xq-capture':''}`} data-row={r} data-col={c} aria-label={`Hàng ${r+1}, cột ${c+1}${piece?`, ${NAMES[piece.side]} ${piece.type}, ${PIECE_NAMES[piece.type]}`:', trống'}${chosen?', đang chọn':''}${canMove?', có thể đi tới':''}${origin?', ô xuất phát nước vừa đi':''}${destination?', ô đến nước vừa đi':''}`} aria-pressed={!!chosen} onClick={()=>clickCell(r,c)}>
        {coordinates && <span className="xq-coordinate" aria-hidden="true">{r+1},{c+1}</span>}
        {piece && <span className={`xq-piece ${piece.side}`} aria-hidden="true">{label(piece)}</span>}
        {canMove && !piece && <span className="xq-dot" aria-hidden="true"/>}
      </button>
    })}
  </div>
  return <><PlayLayout id="xiangqi" title="Cờ tướng" ratio={.9} reserve={260} saved={saved}
    status={<><strong>{winner?`Thắng: ${NAMES[winner]} • ${END_REASONS[reason]}`:checked?`${NAMES[turn]} đang bị chiếu`:`Lượt ${NAMES[turn]}`}</strong><small className="xq-selection">{selected?`Đã chọn ${PIECE_NAMES[selected.type]} ${NAMES[selected.side]} · ${pick[0]+1},${pick[1]+1}`:winner?'Có thể Undo để chơi tiếp.':'Chạm quân, rồi chạm ô đích.'}</small></>}
    statusTone={winner?'xq-won':checked?'xq-check':''} board={boardView} feedback={feedback}
    controls={<><button onClick={()=>navigate(-1)} disabled={cursor===0} aria-label="Undo">↶ Đi lại</button><button onClick={()=>navigate(1)} disabled={cursor===timeline.length} aria-label="Redo">↷ Đi tiếp</button><button onClick={()=>{setGame({...game,flipped:!flipped});setPick(null);setFeedback('')}} aria-pressed={flipped}>Xoay bàn</button></>}
    tools={<><button onClick={()=>setConfirm(true)}>Ván mới</button><label><input type="checkbox" checked={coordinates} onChange={event=>setGame({...game,coordinates:event.target.checked})}/> Hiện tọa độ hàng,cột</label><p className="play-hint">Hai người cùng thiết bị. Ván được lưu tự động.</p></>}
    details={<><details><summary>Cách chơi</summary><p>Đỏ đi trước. Chạm quân để xem nước hợp lệ: chấm xanh là ô trống, vòng đỏ là quân có thể ăn. Nền vàng đánh dấu nước vừa đi.</p><ul><li>Tướng và Sĩ ở trong cung; Tượng không qua sông.</li><li>Mã bị cản chân, Tượng bị cản mắt. Pháo cần đúng một quân làm ngòi khi ăn.</li><li>Không để hai tướng lộ mặt hoặc để tướng mình bị chiếu.</li><li>Chiếu bí hoặc hết nước hợp lệ đều thua.</li><li>Chưa phân xử lặp thế, chiếu dai và đuổi bắt dai.</li></ul></details><details><summary>Lịch sử nước đi ({cursor})</summary>{cursor?<ol className="xq-history">{timeline.slice(0,cursor).map((entry,index)=><li key={index}>{entry.description}</li>)}</ol>:<p>Chưa có nước đi.</p>}<p className="play-hint">Tọa độ hàng,cột cố định dù xoay bàn.</p></details></>}/><ConfirmDialog open={confirm} onCancel={()=>setConfirm(false)} onConfirm={reset}/></>
}
