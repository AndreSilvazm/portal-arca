import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { HttpError, loadPermissions, requireUser, route } from '@/server/session'
import { groups } from '@/lib/data'
import { screens } from '@/lib/shared'

// Define as telas liberadas de um grupo. O Feed é sempre liberado.
export const PUT = route(async req => {
  await requireUser(req, { admin: true })
  const body = await req.json().catch(() => ({}))
  if (!groups.includes(body.group)) throw new HttpError(400, 'Grupo inválido.')
  const list: string[] = Array.isArray(body.screens) ? body.screens : []
  const valid = ['Feed', ...list.filter(s => (screens as readonly string[]).includes(s) && s !== 'Feed')]

  const current = await loadPermissions()
  await db().collection('settings').doc('permissions').set({ ...current, [body.group]: valid })
  return NextResponse.json({ ok: true })
})
