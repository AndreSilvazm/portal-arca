import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { requireUser, route } from '@/server/session'

export const DELETE = route(async (req, ctx) => {
  await requireUser(req, { admin: true })
  const { id } = await ctx.params
  await db().collection('assemblies').doc(id).delete()
  return NextResponse.json({ ok: true })
})
