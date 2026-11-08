import { jwtVerify, SignJWT } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { defaultPermissions, Account, Permissions, Screen } from '@/lib/shared'

export const COOKIE = 'arcanimal_session'
const ISSUER = 'portal-arcanimal'
const MAX_AGE = 60 * 60 * 8 // 8 horas

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export type User = Account & { passwordHash: string; mustChangePassword: boolean; tokenVersion: number }

const secret = () => {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) throw new Error('AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres).')
  return new TextEncoder().encode(value)
}

// JWT próprio (HS256). O `tv` (versão do token) permite invalidar todas as sessões de uma pessoa
// ao trocar/resetar a senha ou desativar o acesso.
export const issueToken = (user: User) =>
  new SignJWT({ tv: user.tokenVersion ?? 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuer(ISSUER).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret())

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
}

export async function currentUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, algorithms: ['HS256'] })
    const snap = await db().collection('users').doc(String(payload.sub)).get()
    if (!snap.exists) return null
    const user = { id: snap.id, ...snap.data() } as User
    if (!user.active || (user.tokenVersion ?? 0) !== payload.tv) return null
    return user
  } catch {
    return null
  }
}

// Defesa extra contra CSRF: requisições que alteram dados precisam vir do próprio site.
function checkOrigin(req: NextRequest) {
  if (req.method === 'GET' || req.method === 'HEAD') return
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== req.headers.get('host')) throw new HttpError(403, 'Origem não permitida.')
}

export async function requireUser(req: NextRequest, opts: { admin?: boolean; allowPending?: boolean } = {}) {
  checkOrigin(req)
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'Sessão expirada. Entre novamente.')
  if (user.mustChangePassword && !opts.allowPending) throw new HttpError(403, 'Defina uma nova senha para continuar.')
  if (opts.admin && !user.admin) throw new HttpError(403, 'Sem permissão.')
  return user
}

export const publicUser = (u: User): Account => ({ id: u.id, name: u.name, email: u.email, role: u.role, group: u.group, active: u.active, admin: u.admin })

export async function loadPermissions(): Promise<Permissions> {
  const snap = await db().collection('settings').doc('permissions').get()
  return { ...defaultPermissions, ...(snap.exists ? (snap.data() as Partial<Permissions>) : {}) }
}

export const canSee = (user: User, permissions: Permissions, screen: Screen) =>
  user.admin || screen === 'Feed' || (permissions[user.group] ?? []).includes(screen)

type Ctx = { params: Promise<Record<string, string>> }

// Envolve a rota: converte HttpError em resposta JSON e esconde falhas internas.
export function route(handler: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
      console.error(e)
      return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
    }
  }
}
