'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Group } from './data'
import { Account, Assembly, defaultPermissions, Permissions, Poll, Post, Screen, screens, StateResponse, StoredDoc } from './shared'

export * from './shared'

export type Session = { email: string; name: string; group: Group; admin: boolean; screens: Screen[]; mustChangePassword: boolean }

type NewAccount = Pick<Account, 'name' | 'email' | 'role' | 'group'>
type NewPoll = { title: string; description: string; meeting: string; opensAt?: string; endsAt: string; audience: Poll['audience'] }
type NewAssembly = Pick<Assembly, 'kind' | 'title' | 'startsAt' | 'place' | 'agenda'>
type NewPost = Pick<Post, 'type' | 'title' | 'text'>
// Resultado de uma operação: null = deu certo, texto = mensagem de erro para mostrar na tela.
type Result = Promise<string | null>
type AccountResult = Promise<{ error: string | null; tempPassword?: string }>

type Store = {
  ready: boolean
  session: Session | null
  accounts: Account[]
  permissions: Permissions
  documents: StoredDoc[]
  posts: Post[]
  polls: Poll[]
  assemblies: Assembly[]
  login: (email: string, password: string) => Result
  logout: () => Promise<void>
  changePassword: (current: string, next: string) => Result
  createAccount: (account: NewAccount) => AccountResult
  resetMemberPassword: (id: string) => AccountResult
  setAccountActive: (id: string, active: boolean) => Result
  setAccountGroup: (id: string, group: Group) => Result
  setPermission: (group: Group, screen: Screen, allowed: boolean) => Result
  addDocuments: (folder: string, files: File[]) => Result
  createAssembly: (assembly: NewAssembly) => Result
  removeAssembly: (id: string) => Result
  createPost: (post: NewPost, files: File[]) => Result
  createPoll: (poll: NewPoll, files: File[]) => Result
  releasePoll: (id: string) => Result
  deletePoll: (id: string) => Result
  closePoll: (id: string) => Result
  vote: (id: string, option: string) => Result
}

const StoreContext = createContext<Store | null>(null)

// agendada: criada mas não liberada (só a Secretaria vê) · aberta: liberada e dentro do prazo · encerrada
export type PollStatus = 'scheduled' | 'open' | 'closed'
export const pollStatus = (poll: Poll): PollStatus =>
  !poll.releasedAt ? 'scheduled' : poll.closedAt || new Date(poll.endsAt).getTime() <= Date.now() ? 'closed' : 'open'
export const isOpen = (poll: Poll) => pollStatus(poll) === 'open'
export const canVote = (poll: Poll, session: Session) => poll.audience.all || poll.audience.groups.includes(session.group)
export const audienceLabel = (poll: Poll) => (poll.audience.all ? 'Todos os membros' : poll.audience.groups.join(', '))
export const totalVotes = (poll: Poll) => Object.values(poll.counts).reduce((a, b) => a + b, 0)
export const isUpcoming = (a: Assembly) => new Date(a.startsAt).getTime() > Date.now()
export const canSee = (session: Session, screen: Screen) => session.admin || session.screens.includes(screen)

type Call = { method?: string; json?: unknown; form?: FormData }

// Chamada à API do portal. O cookie de sessão (JWT httpOnly) vai junto automaticamente.
async function call(path: string, { method = 'POST', json, form }: Call = {}) {
  try {
    const res = await fetch(path, {
      method,
      headers: json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : String(data.error ?? 'Não foi possível concluir. Tente novamente.') }
  } catch {
    return { ok: false, status: 0, data: {}, error: 'Sem conexão. Verifique sua internet.' }
  }
}

const REFRESH_MS = 15000

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StateResponse | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      if (res.status === 401) setData(null)
      else if (res.ok) setData(await res.json())
    } catch {}
    setReady(true)
  }, [])

  // Atualiza ao abrir, a cada 15 s e quando a aba volta ao foco.
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, REFRESH_MS)
    const onVisible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [refresh])

  const permissions = data?.permissions ?? defaultPermissions

  const session = useMemo<Session | null>(() => {
    const profile = data?.profile
    if (!profile) return null
    return {
      email: profile.email, name: profile.name, group: profile.group, admin: profile.admin, mustChangePassword: profile.mustChangePassword,
      screens: profile.admin ? [...screens] : ['Feed', ...permissions[profile.group]].filter((x, i, all) => all.indexOf(x) === i) as Screen[],
    }
  }, [data, permissions])

  const store = useMemo<Store>(() => {
    // Operação que altera dados: chama a API e, se der certo, recarrega o estado.
    const act = async (path: string, options?: Call): Result => {
      const { ok, error } = await call(path, options)
      if (ok) await refresh()
      return error
    }
    const accountAct = async (path: string, options: Call): AccountResult => {
      const { ok, error, data: body } = await call(path, options)
      if (ok) await refresh()
      return { error, tempPassword: body.tempPassword }
    }

    return {
      ready,
      session,
      accounts: data?.accounts ?? [],
      permissions,
      documents: data?.documents ?? [],
      posts: data?.posts ?? [],
      polls: data?.polls ?? [],
      assemblies: data?.assemblies ?? [],

      login: (email, password) => act('/api/auth/login', { json: { email, password } }),
      logout: async () => { await call('/api/auth/logout'); setData(null) },
      changePassword: (current, next) => act('/api/auth/password', { json: { current, next } }),

      createAccount: account => accountAct('/api/members', { json: account }),
      resetMemberPassword: id => accountAct(`/api/members/${id}`, { method: 'PATCH', json: { resetPassword: true } }),
      setAccountGroup: (id, group) => act(`/api/members/${id}`, { method: 'PATCH', json: { group } }),
      setAccountActive: (id, active) => act(`/api/members/${id}`, { method: 'PATCH', json: { active } }),
      setPermission: (group, screen, allowed) => {
        if (screen === 'Feed') return Promise.resolve(null)
        const next = allowed ? [...new Set([...permissions[group], screen])] : permissions[group].filter(x => x !== screen)
        return act('/api/permissions', { method: 'PUT', json: { group, screens: next } })
      },

      addDocuments: (folder, files) => {
        const form = new FormData()
        form.set('folder', folder)
        files.forEach(f => form.append('files', f))
        return act('/api/documents', { form })
      },
      createAssembly: assembly => act('/api/assemblies', { json: { ...assembly, startsAt: assembly.startsAt } }),
      removeAssembly: id => act(`/api/assemblies/${id}`, { method: 'DELETE' }),
      createPost: (post, files) => {
        const form = new FormData()
        form.set('type', post.type); form.set('title', post.title); form.set('text', post.text)
        files.forEach(f => form.append('files', f))
        return act('/api/posts', { form })
      },
      createPoll: (poll, files) => {
        const form = new FormData()
        form.set('title', poll.title); form.set('description', poll.description); form.set('meeting', poll.meeting)
        form.set('endsAt', new Date(poll.endsAt).toISOString()) // datetime-local é horário local; o servidor recebe ISO
        if (poll.opensAt) form.set('opensAt', new Date(poll.opensAt).toISOString())
        form.set('audience', JSON.stringify(poll.audience))
        files.forEach(f => form.append('files', f))
        return act('/api/polls', { form })
      },
      releasePoll: id => act(`/api/polls/${id}/release`),
      deletePoll: id => act(`/api/polls/${id}`, { method: 'DELETE' }),
      closePoll: id => act(`/api/polls/${id}/close`),
      vote: (id, option) => act(`/api/polls/${id}/vote`, { json: { option } }),
    }
  }, [ready, session, data, permissions, refresh])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore deve ser usado dentro de StoreProvider')
  return store
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '')

export const formatSize = (bytes: number) =>
  !bytes ? 'Arquivo' : bytes > 1e6 ? `${(bytes / 1e6).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1e3)} KB`
