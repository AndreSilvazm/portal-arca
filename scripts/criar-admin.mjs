// Cria (ou atualiza) a conta de administrador da Secretaria na tabela `users`.
// A senha é guardada só como hash (scrypt) — a mesma função usada pelo login do portal.
//
// Dois modos, escolhidos automaticamente como o servidor faz:
//  - SEM credenciais do Firebase: grava no banco local (.data/db.json), para desenvolvimento.
//  - COM GOOGLE_APPLICATION_CREDENTIALS (ou FIREBASE_SERVICE_ACCOUNT): grava no Firestore.
//
// Uso:
//   node scripts/criar-admin.mjs                       (pergunta e-mail e senha)
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/criar-admin.mjs   (sem perguntas)

import fs from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { hashPassword } from '../src/server/password.mjs'

const NAME = 'André Simão'
const ROLE = 'Diretor de Secretaria'

// Lê .env.local para escolher o modo igual ao servidor (sem sobrescrever variáveis já definidas).
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
} catch {}

function ask(question, { hidden = false } = {}) {
  let muted = false
  const output = new Writable({ write(chunk, enc, cb) { if (!muted) process.stdout.write(chunk, enc); cb() } })
  const rl = createInterface({ input: process.stdin, output, terminal: true })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer.trim()) })
    muted = hidden
  })
}

const email = (process.env.ADMIN_EMAIL ?? (await ask('E-mail de acesso: '))).trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? (await ask('Senha (mínimo 8 caracteres): ', { hidden: true }))
if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
  console.error('E-mail inválido ou senha curta demais (mínimo 8 caracteres).')
  process.exit(1)
}

const passwordHash = await hashPassword(password)
const base = { name: NAME, email, role: ROLE, group: 'Diretoria Executiva', active: true, admin: true, passwordHash, mustChangePassword: false }

if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Modo local: o mesmo formato que src/server/localdb.ts lê (caminho do documento -> dados).
  const file = path.join('.data', 'db.json')
  fs.mkdirSync('.data', { recursive: true })
  const store = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  const found = Object.entries(store).find(([key, value]) => /^users\/[^/]+$/.test(key) && value.email === email)
  const key = found?.[0] ?? `users/${Math.random().toString(36).slice(2, 12)}`
  const previous = found?.[1]
  // Muda a versão do token: sessões antigas desta conta deixam de valer.
  store[key] = { ...base, tokenVersion: (previous?.tokenVersion ?? 0) + 1, createdAt: previous?.createdAt ?? new Date().toISOString() }
  fs.writeFileSync(file, JSON.stringify(store, null, 1))
  console.log(`[banco local] ${found ? 'Conta atualizada' : 'Conta criada'}: ${NAME} — ${ROLE} (${email}).`)
} else {
  const { applicationDefault, initializeApp } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')
  initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID ?? 'portal-arcanimal' })
  const users = getFirestore().collection('users')
  const existing = await users.where('email', '==', email).limit(1).get()
  const ref = existing.empty ? users.doc() : existing.docs[0].ref
  const previous = existing.empty ? null : existing.docs[0].data()
  await ref.set({ ...base, tokenVersion: (previous?.tokenVersion ?? 0) + 1, createdAt: previous?.createdAt ?? new Date().toISOString() })
  console.log(`[Firestore] ${existing.empty ? 'Conta criada' : 'Conta atualizada'}: ${NAME} — ${ROLE} (${email}).`)
}
console.log('Entre em /login.')
