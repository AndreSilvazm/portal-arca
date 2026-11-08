'use client'

import { Page, PostCard } from '@/components/Posts'
import { RichText } from '@/components/PostForm'
import { Assembly, canSee, isUpcoming, useStore } from '@/lib/store'

const Icon = ({ children }: { children: React.ReactNode }) => <svg viewBox="0 0 24 24" aria-hidden>{children}</svg>

// "Hoje", "Amanhã" ou "Em N dias" para os encontros dos próximos 14 dias.
function proximity(date: Date) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return days > 1 && days <= 14 ? `Em ${days} dias` : null
}

export function AssemblyCard({ a, past = false }: { a: Assembly; past?: boolean }) {
  const d = new Date(a.startsAt)
  const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
  const fullDate = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
  const soon = past ? null : proximity(d)
  return <article className={`assembly-card${past ? ' past' : ''}`}>
    <time dateTime={a.startsAt}><b>{String(d.getDate()).padStart(2, '0')}</b>{month}<i>{d.getFullYear()}</i></time>
    <div className="assembly-body">
      <div className="assembly-top">{a.title !== a.kind && <span className="assembly-kind">{a.kind}</span>}{soon && <span className="assembly-soon">{soon}</span>}</div>
      <h3>{a.title}</h3>
      <div className="assembly-meta">
        <span><Icon><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></Icon>{fullDate}</span>
        <span><Icon><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>{time}</span>
        <span><Icon><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></Icon>{a.place}</span>
      </div>
      {a.agenda && <p className="assembly-agenda"><RichText text={a.agenda}/></p>}
    </div>
  </article>
}

const Heading = ({ children, count }: { children: React.ReactNode; count?: number }) =>
  <h2 className="section-title">{children}{count !== undefined && <span>{count}</span>}</h2>

export default function Assembleias() {
  const { assemblies, posts, session } = useStore()
  const upcoming = assemblies.filter(isUpcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = assemblies.filter(a => !isUpcoming(a)).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const atas = session && canSee(session, 'Documentos') ? posts.filter(p => p.type === 'Ata de reunião') : null
  return <Page active="Assembleias" label="ENCONTROS" title="Assembleias" text="Próximos encontros, convocações e as atas das reuniões realizadas.">
    <Heading count={upcoming.length}>Próximas</Heading>
    <div className="assembly-list">{upcoming.length ? upcoming.map(a => <AssemblyCard key={a.id} a={a}/>) : <p className="empty">Nenhum encontro agendado.</p>}</div>
    {past.length > 0 && <><Heading count={past.length}>Realizadas</Heading><div className="assembly-list">{past.map(a => <AssemblyCard key={a.id} a={a} past/>)}</div></>}
    {atas && <><Heading count={atas.length}>Atas de reunião</Heading>
    <div className="internal-feed">{atas.length ? atas.map(p => <PostCard key={p.id} post={p}/>) : <p className="empty">Nenhuma ata publicada ainda.</p>}</div></>}
  </Page>
}
