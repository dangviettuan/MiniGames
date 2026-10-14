import React, { useState } from 'react'
import Xiangqi from './App.jsx'
import './hub.css'

const modules = import.meta.glob('./games/*/index.jsx', { eager: true })
const games = [{ id: 'xiangqi', title: 'Cờ tướng', component: Xiangqi }, ...Object.values(modules).map(m => m.default)].sort((a,b) => ['xiangqi','chess','go','co-ca-ngua'].indexOf(a.id)-['xiangqi','chess','go','co-ca-ngua'].indexOf(b.id))
export default function GameHub() {
  const readHash = () => games.some(g => g.id === location.hash.slice(1)) ? location.hash.slice(1) : 'xiangqi'
  const [active, setActive] = useState(readHash)
  React.useEffect(() => { const sync = () => setActive(readHash()); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync) }, [])
  const game = games.find(g => g.id === active) || games[0]
  const Game = game.component
  return <><nav className="game-nav" aria-label="Chọn trò chơi">{games.map(g => <a key={g.id} href={'#'+g.id} aria-current={g.id === game.id ? 'page' : undefined}>{g.title}</a>)}</nav><main><Game key={game.id}/></main></>
}
