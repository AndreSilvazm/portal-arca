'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Member } from '@/lib/data'

export type Page = 'inicio' | 'instituto' | 'governanca' | 'comunicacao' | 'transparencia' | 'login' | 'membros' | 'admin'

const routes: Record<Page, string> = {
  inicio: '/',
  instituto: '/instituto',
  governanca: '/governanca',
  comunicacao: '/comunicacao',
  transparencia: '/transparencia',
  login: '/login',
  membros: '/membros',
  admin: '/membros/admin',
}

export function useNavigate() {
  const router = useRouter()
  return (page: Page) => router.push(routes[page])
}

export function Mark() {
  return <span className="mark" aria-label="Espaço reservado para símbolo oficial"><i/><i/><i/><i/><b/></span>
}

export function Logo({ inverse = false }: { inverse?: boolean }) {
  const navigate = useNavigate()
  return <button className={`logo ${inverse ? 'inverse' : ''}`} onClick={() => navigate('inicio')}><Mark/><strong>ARCANIMAL</strong></button>
}

export function Arrow() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="label"><i/>{children}</div>
}

export function LinkButton({ children, page }: { children: ReactNode; page: Page }) {
  const navigate = useNavigate()
  return <button className="link-button" onClick={() => navigate(page)}>{children}<Arrow/></button>
}

export function HeroPage({ number, label, title, text }: { number: string; label: string; title: ReactNode; text: string }) {
  return <section className="page-hero"><span>{number} / {label}</span><h1>{title}</h1><p>{text}</p></section>
}

export function Photo({ member }: { member: Member }) {
  return <Image src={member.image!} alt={`Foto de ${member.name}`} width={640} height={768} sizes="(max-width: 900px) 100vw, 480px"/>
}
