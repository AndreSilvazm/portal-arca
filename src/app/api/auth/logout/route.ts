import { NextResponse } from 'next/server'
import { clearSessionCookie, route } from '@/server/session'

export const POST = route(async () => {
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
})
