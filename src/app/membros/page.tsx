'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WorkspaceShell from '@/components/Workspace'
import PostForm from '@/components/PostForm'
import { PostCard } from '@/components/Posts'
import { PollCard } from '@/components/Polls'
import { NextMeeting } from '@/components/NextMeeting'
import { Label } from '@/components/ui'
import { canSee, isOpen, PostType, Screen, useStore } from '@/lib/store'

// Cada tipo de publicação só aparece no feed para quem pode ver a tela correspondente.
const typeScreen: Record<PostType, Screen> = { 'Comunicado oficial': 'Comunicados', 'Decisão': 'Decisões', 'Ata de reunião': 'Documentos' }

export default function Feed() {
  const router = useRouter()
  const { session, posts, polls } = useStore()
  const [filter, setFilter] = useState('Todos')
  const [composer, setComposer] = useState(false)

  const allowed = (screen: Screen) => !!session && canSee(session, screen)
  const shown = posts.filter(post => allowed(typeScreen[post.type]))
  const visible = filter === 'Todos' ? shown : shown.filter(post => post.type === filter)
  const openPolls = allowed('Votações') ? polls.filter(isOpen) : []
  const types = (Object.keys(typeScreen) as PostType[]).filter(t => allowed(typeScreen[t]))

  return <WorkspaceShell active="Feed">
    {session && <div className="feed-layout"><section className="feed-main"><div className="feed-title"><div><Label>AMBIENTE INTERNO</Label><h1>Feed do Instituto</h1><p>Comunicados, decisões e registros em ordem cronológica.</p></div>{session.admin && <button onClick={() => setComposer(!composer)}>+ Nova publicação</button>}</div>
      {composer && <PostForm onCreated={() => setComposer(false)}/>}
      <div className="feed-filters">{['Todos', ...types].map(x => <button className={filter === x ? 'active' : ''} onClick={() => setFilter(x)} key={x}>{x}</button>)}</div>
      <div className="internal-feed">{visible.map(post => <PostCard key={post.id} post={post}/>)}</div>
    </section><aside className="feed-aside">
      {!allowed('Votações') ? null : openPolls.length ? openPolls.slice(0, 2).map(p => <PollCard key={p.id} poll={p} session={session} onOpen={() => router.push(`/membros/votacoes/${p.id}`)}/>) : <section><span>VOTAÇÕES</span><h3>Nenhuma votação aberta no momento.</h3></section>}
      {allowed('Assembleias') && <NextMeeting/>}
    </aside></div>}
  </WorkspaceShell>
}
