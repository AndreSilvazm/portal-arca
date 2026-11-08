import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { canSee, loadPermissions, publicUser, requireUser, route, User } from '@/server/session'
import { Account, Assembly, folders, folderScreen, optionKeys, Poll, Post, postScreen, PostType, StateResponse, StoredDoc, voteOptions } from '@/lib/shared'

// Tudo o que a pessoa logada pode ver, já filtrado por grupo/permissão. A apuração só sai depois do encerramento.
export const GET = route(async req => {
  const user = await requireUser(req, { allowPending: true })
  const permissions = await loadPermissions()
  const profile = { ...publicUser(user), mustChangePassword: !!user.mustChangePassword }
  const empty: StateResponse = { profile, permissions, accounts: [], posts: [], documents: [], polls: [], assemblies: [] }
  const noStore = { headers: { 'Cache-Control': 'no-store' } }
  if (user.mustChangePassword) return NextResponse.json(empty, noStore)

  const firestore = db()
  const see = (screen: Parameters<typeof canSee>[2]) => canSee(user, permissions, screen)
  const list = async <T,>(collection: string, field?: string, value?: string) => {
    const ref = firestore.collection(collection)
    const snap = await (field ? ref.where(field, '==', value) : ref).get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)
  }

  const [accounts, posts, documents, assemblies, rawPolls] = await Promise.all([
    user.admin ? list<User>('users').then(all => all.map(publicUser).sort((a, b) => a.name.localeCompare(b.name))) : Promise.resolve<Account[]>([publicUser(user)]),
    Promise.all((Object.keys(postScreen) as PostType[]).filter(t => see(postScreen[t])).map(t => list<Post>('posts', 'type', t))).then(r => r.flat()),
    Promise.all(folders.filter(f => see(folderScreen[f])).map(f => list<StoredDoc>('documents', 'folder', f))).then(r => r.flat()),
    see('Assembleias') ? list<Assembly>('assemblies') : Promise.resolve<Assembly[]>([]),
    see('Votações') || see('Eleições e resultados') ? list<Omit<Poll, 'counts' | 'total' | 'voted'> & { closedAt: string | null; releasedAt: string | null; opensAt: string | null }>('polls') : Promise.resolve([]),
  ])

  // Votação não liberada é invisível para os membros; só a Secretaria a enxerga (agendada).
  const visible = user.admin ? rawPolls : rawPolls.filter(p => p.releasedAt)

  const now = Date.now()
  const refs = visible.flatMap(p => [firestore.doc(`polls/${p.id}/tally/counts`), firestore.doc(`polls/${p.id}/participants/${user.id}`)])
  const docs = refs.length ? await firestore.getAll(...refs) : []

  const polls: Poll[] = visible.map((p, i) => {
    const tally = docs[i * 2]
    const closed = !!p.releasedAt && (!!p.closedAt || new Date(p.endsAt).getTime() <= now)
    const data = tally.data() ?? {}
    return {
      ...p,
      closedAt: p.closedAt ?? undefined,
      releasedAt: p.releasedAt ?? undefined,
      opensAt: p.opensAt ?? undefined,
      // Voto secreto: nem a Secretaria recebe a divisão dos votos antes do encerramento (só a participação).
      counts: closed ? Object.fromEntries(voteOptions.map((label, k) => [label, Number(data[optionKeys[k]] ?? 0)])) : Object.fromEntries(voteOptions.map(l => [l, 0])),
      total: closed || user.admin ? Number(data.total ?? 0) : 0,
      voted: docs[i * 2 + 1].exists,
    }
  })

  const byDate = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)
  return NextResponse.json({ ...empty, accounts, posts: posts.sort(byDate), documents: documents.sort(byDate), assemblies: assemblies.sort(byDate), polls: polls.sort(byDate) }, noStore)
})
