'use client'

import { useRouter } from 'next/navigation'
import { Page } from '@/components/Posts'
import { PollCard } from '@/components/Polls'
import { useStore } from '@/lib/store'

export default function Votacoes() {
  const router = useRouter()
  const { session, polls } = useStore()
  return <Page active="Votações" label="PARTICIPAÇÃO" title="Votações" text="Pautas abertas e resultados das votações encerradas."
    action={session?.admin && <button onClick={() => router.push('/membros/admin')}>+ Criar votação</button>}>
    <div className="poll-list">{session && (polls.length ? polls.map(p => <PollCard key={p.id} poll={p} session={session} onOpen={() => router.push(`/membros/votacoes/${p.id}`)}/>) : <p className="empty">Nenhuma votação criada ainda.</p>)}</div>
  </Page>
}
