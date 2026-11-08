import { NextResponse } from 'next/server'
import { db, fetchFile, isLocal } from '@/server/db'
import { localReadFile } from '@/server/localdb'
import { canSee, HttpError, loadPermissions, requireUser, route } from '@/server/session'
import { folderScreen, folderSlug, postScreen, postTypeSlug, PostType, Screen } from '@/lib/shared'

// A tela que libera cada prefixo de caminho (veja server/files.ts).
function screenFor(path: string): Screen | null {
  const [root, slug] = path.split('/')
  if (root === 'polls') return 'Votações'
  if (root === 'posts') {
    const type = (Object.keys(postTypeSlug) as PostType[]).find(t => postTypeSlug[t] === slug)
    return type ? postScreen[type] : null
  }
  if (root === 'documents') {
    const folder = Object.keys(folderSlug).find(f => folderSlug[f] === slug)
    return folder ? folderScreen[folder] : null
  }
  return null
}

// Confere a permissão e entrega o arquivo (link assinado de 2 minutos no Storage; direto no modo local).
export const GET = route(async req => {
  const user = await requireUser(req)
  const path = req.nextUrl.searchParams.get('path') ?? ''
  const screen = path.includes('..') ? null : screenFor(path)
  if (!screen) throw new HttpError(400, 'Arquivo inválido.')
  const permissions = await loadPermissions()
  // "Eleições e resultados" também enxerga as pautas das votações encerradas.
  const allowed = canSee(user, permissions, screen) || (screen === 'Votações' && canSee(user, permissions, 'Eleições e resultados'))
  if (!allowed) throw new HttpError(403, 'Sem permissão para este arquivo.')

  // Anexos de votação ainda não liberada só a Secretaria baixa.
  if (path.startsWith('polls/') && !user.admin) {
    const polls = await db().collection('polls').get()
    const owner = polls.docs.find(d => ((d.data().documents ?? []) as { path?: string }[]).some(x => x.path === path))
    if (!owner?.data().releasedAt) throw new HttpError(403, 'Sem permissão para este arquivo.')
  }

  let data: Buffer | null
  if (isLocal()) {
    data = await localReadFile(path)
  } else {
    const found = await fetchFile(path)
    if (found?.url) return NextResponse.redirect(found.url)
    data = found?.data ?? null
  }
  if (!data) throw new HttpError(404, 'Arquivo não encontrado.')
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const inline: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
  const name = encodeURIComponent(path.split('/').pop()!.replace(/^[a-z0-9]{8}-/, ''))
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': inline[ext] ?? 'application/octet-stream',
      'Content-Disposition': `${inline[ext] ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'sandbox',
    },
  })
})
