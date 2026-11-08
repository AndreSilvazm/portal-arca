'use client'

import { useParams, useRouter } from 'next/navigation'
import WorkspaceShell from '@/components/Workspace'
import { PollPage } from '@/components/Polls'
import { useStore } from '@/lib/store'

export default function Votacao() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { session, polls } = useStore()
  const poll = polls.find(p => p.id === id)
  return <WorkspaceShell active="Votações">
    {session && (poll
      ? <PollPage poll={poll} session={session} onBack={() => router.push('/membros/votacoes')}/>
      : <div className="feed-layout single"><p className="empty">Votação não encontrada.</p></div>)}
  </WorkspaceShell>
}
