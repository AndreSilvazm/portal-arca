'use client'

import { useRouter } from 'next/navigation'
import { Arrow } from './ui'
import { isUpcoming, useStore } from '@/lib/store'

export function NextMeeting() {
  const router = useRouter()
  const { assemblies } = useStore()
  const next = assemblies.filter(isUpcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  if (!next) return <section><span>PRÓXIMO ENCONTRO</span><h3>Nenhum encontro agendado.</h3></section>
  const d = new Date(next.startsAt)
  const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
  return <section><span>PRÓXIMO ENCONTRO</span><time><b>{String(d.getDate()).padStart(2, '0')}</b>{month} · {String(d.getHours()).padStart(2, '0')}H</time><h3>{next.title}</h3><button onClick={() => router.push('/membros/assembleias')}>Ver detalhes <Arrow/></button></section>
}
