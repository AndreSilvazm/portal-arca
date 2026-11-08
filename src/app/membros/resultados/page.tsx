'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Page } from '@/components/Posts'
import { Results } from '@/components/Polls'
import { generateResultPdf } from '@/lib/resultPdf'
import { audienceLabel, formatDate, pollStatus, useStore } from '@/lib/store'

export default function Resultados() {
  const router = useRouter()
  const { session, polls, accounts } = useStore()
  const [busy, setBusy] = useState('')
  const closed = polls.filter(p => pollStatus(p) === 'closed').sort((a, b) => (b.closedAt ?? b.endsAt).localeCompare(a.closedAt ?? a.endsAt))
  const secretary = accounts.find(a => a.admin) ?? { name: 'Secretaria', role: 'Diretor de Secretaria' }
  const pdf = async (id: string) => {
    const poll = polls.find(p => p.id === id)
    if (!poll) return
    setBusy(id)
    try { await generateResultPdf(poll, secretary) } finally { setBusy('') }
  }
  return <Page active="Eleições e resultados" label="APURAÇÃO" title="Eleições e resultados" text="Resultado das votações encerradas. Votações em andamento não exibem apuração.">
    <div className="result-list">{closed.length ? closed.map(p => <article key={p.id}>
      <small>{p.closedAt ? 'Encerrada pela Secretaria' : 'Encerrada por prazo'} · {formatDate(p.closedAt ?? p.endsAt)}</small>
      <h3>{p.title}</h3>
      <p className="when">Podiam votar: {audienceLabel(p)}</p>
      <Results poll={p}/>
      <div className="result-actions"><button onClick={() => router.push(`/membros/votacoes/${p.id}`)}>Ver pauta</button>{session?.admin && <button className="pdf" disabled={busy === p.id} onClick={() => pdf(p.id)}>{busy === p.id ? 'Gerando PDF...' : 'Gerar PDF do resultado'}</button>}</div>
    </article>) : <p className="empty">Nenhuma votação encerrada ainda.</p>}</div>
  </Page>
}
