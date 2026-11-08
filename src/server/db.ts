import { applicationDefault, cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, Firestore, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { localDb, localIncrement, localPutFile } from './localdb'
import { restDb } from './restdb'

// Três modos, nesta ordem:
//  - admin: FIREBASE_SERVICE_ACCOUNT (JSON), GOOGLE_APPLICATION_CREDENTIALS (arquivo da chave) ou USE_FIREBASE=true (gcloud).
//    Usa Firestore e Storage de verdade.
//  - rest: FIREBASE_API_KEY + FIREBASE_PROJECT_ID. Firestore pela API REST com a chave web, sem conta de serviço.
//    Os arquivos anexados continuam em .data/files (o Storage exige plano pago).
//  - local: nenhuma das anteriores (ou USE_LOCAL_DB=true). Banco em arquivo (.data/), só para desenvolvimento.
type Mode = 'admin' | 'rest' | 'local'
const mode = (): Mode =>
  process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.USE_FIREBASE === 'true' ? 'admin'
    : process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID && process.env.USE_LOCAL_DB !== 'true' ? 'rest'
    : 'local'

// Os arquivos anexados ficam no disco local sempre que não houver Storage (modos rest e local).
export const isLocal = () => mode() !== 'admin'

function app() {
  if (getApps().length) return getApp()
  const json = process.env.FIREBASE_SERVICE_ACCOUNT
  return initializeApp({
    credential: json ? cert(JSON.parse(json)) : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
}

export const db = (): Firestore => {
  const m = mode()
  return m === 'admin' ? getFirestore(app()) : ((m === 'rest' ? restDb : localDb) as unknown as Firestore)
}

// Soma atômica em um campo (Firestore, REST ou banco local).
export const increment = (n: number) => (mode() === 'admin' ? FieldValue.increment(n) : (localIncrement(n) as unknown as FieldValue))

export async function putFile(path: string, data: Buffer, contentType: string) {
  if (isLocal()) return localPutFile(path, data)
  await getStorage(app()).bucket().file(path).save(data, { contentType, resumable: false })
}

// Entrega do arquivo: link assinado de curta duração quando a credencial permite assinar (conta de serviço);
// senão (credenciais de usuário do gcloud) o servidor lê o arquivo e o devolve. No modo local lê de .data/files.
export async function fetchFile(path: string): Promise<{ url?: string; data?: Buffer } | undefined> {
  if (isLocal()) return undefined
  const file = getStorage(app()).bucket().file(path)
  if (!(await file.exists())[0]) return { }
  try {
    return { url: (await file.getSignedUrl({ action: 'read', expires: Date.now() + 2 * 60 * 1000 }))[0] }
  } catch {
    return { data: (await file.download())[0] }
  }
}
