'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo, useNavigate } from './ui'
import { canSee, Screen, useStore } from '@/lib/store'

type Props = { active: string; adminOnly?: boolean; children: ReactNode }

const routes: Record<string, string> = {
  'Feed': '/membros',
  'Votações': '/membros/votacoes',
  'Comunicados': '/membros/comunicados',
  'Assembleias': '/membros/assembleias',
  'Documentos': '/membros/documentos',
  'Decisões': '/membros/decisoes',
  'Eleições e resultados': '/membros/resultados',
  'Administração': '/membros/admin',
}

export default function WorkspaceShell({ active, adminOnly = false, children }: Props) {
  const navigate = useNavigate()
  const router = useRouter()
  const { ready, session, logout } = useStore()

  useEffect(() => {
    if (!ready) return
    if (!session) navigate('login')
    else if (session.mustChangePassword) router.replace('/trocar-senha')
    else if (adminOnly && !session.admin) navigate('membros')
    else if (!adminOnly && !canSee(session, active as Screen)) navigate('membros')
  }, [ready, session, adminOnly, active])

  if (!ready || !session || session.mustChangePassword || (adminOnly && !session.admin) || (!adminOnly && !canSee(session, active as Screen))) return null

  const items = Object.keys(routes).filter(x => (x === 'Administração' ? session.admin : canSee(session, x as Screen)))
  const initials = session.name.split(' ').map(w => w[0]).slice(0, 2).join('')

  return <div className="workspace">
    <aside><Logo inverse/><nav>{items.map((x,i)=><button className={x===active?'active':''} onClick={()=>router.push(routes[x])} key={x}><span>{String(i+1).padStart(2,'0')}</span>{x}</button>)}</nav><button className="user"><b>{initials}</b><span>{session.name}<small>{session.admin ? 'Diretor de Secretaria' : session.group}</small></span></button></aside>
    <main>
      <header><div><small>INSTITUTO ARCANIMAL</small><b>Ambiente de membros</b></div><button onClick={async()=>{await logout();navigate('inicio')}}>Sair</button></header>
      {children}
    </main>
  </div>
}
