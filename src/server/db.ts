import { applicationDefault, cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, Firestore, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { localDb, localIncrement, localPutFile } from './localdb'

// Sem credenciais do Firebase, o servidor usa um banco local em arquivo (.data/) — só para desenvolvimento.
// Usa Firestore e Storage de verdade com: FIREBASE_SERVICE_ACCOUNT (JSON), GOOGLE_APPLICATION_CREDENTIALS (arquivo da
// chave) ou USE_FIREBASE=true (credenciais do gcloud: `gcloud auth application-default login`, sem arquivo de chave).
export const isLocal = () => !process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.USE_FIREBASE !== 'true'

function app() {
  if (getApps().length) return getApp()
  const json = process.env.FIREBASE_SERVICE_ACCOUNT
  return initializeApp({
    credential: json ? cert(JSON.parse(json)) : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
}

export const db = (): Firestore => (isLocal() ? (localDb as unknown as Firestore) : getFirestore(app()))

// Soma atômica em um campo (Firestore ou banco local).
export const increment = (n: number) => (isLocal() ? (localIncrement(n) as unknown as FieldValue) : FieldValue.increment(n))

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
