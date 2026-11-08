'use client'

import { ReactNode, useState } from 'react'
import { Arrow, Logo, Page, useNavigate } from './ui'

function Header() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const links: [string, Page][] = [['Instituto','instituto'],['Governança','governanca'],['Comunicação','comunicacao'],['Transparência','transparencia']]
  const go = (page: Page) => { navigate(page); setOpen(false) }
  return <header className="site-header">
    <Logo/>
    <nav className={open ? 'open' : ''}>
      {links.map(([label,page]) => <button key={page} onClick={() => go(page)}>{label}</button>)}
    </nav>
    <button className="access" onClick={() => go('login')}>Área de membros <Arrow/></button>
    <button className="menu" onClick={() => setOpen(!open)}>{open ? 'Fechar' : 'Menu'}</button>
  </header>
}

function Footer() {
  const navigate = useNavigate()
  return <footer><div><Logo inverse/><p>Tecnologia, colaboração e impacto institucional.</p></div><div><b>INSTITUTO</b><button onClick={() => navigate('instituto')}>Sobre</button><button onClick={() => navigate('governanca')}>Governança</button></div><div><b>INFORMAÇÃO</b><button onClick={() => navigate('comunicacao')}>Comunicação</button><button onClick={() => navigate('transparencia')}>Transparência</button></div><div><b>CONTATO</b><span>contato@arcanimal.org.br</span><span>Brasil</span></div><small>© 2025 Instituto Arcanimal</small></footer>
}

export default function Shell({ children }: { children: ReactNode }) {
  return <><Header/><main>{children}</main><Footer/></>
}
