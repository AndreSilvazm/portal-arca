import { putFile } from './db'
import { HttpError } from './session'
import type { Doc } from '@/lib/shared'

const MAX_SIZE = 25 * 1024 * 1024

const clean = (name: string) => name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(-80) || 'arquivo'

// O prefixo do caminho ("posts/decisoes/...", "polls/...", "documents/atas/...") diz qual tela dá acesso ao arquivo.
export async function saveFiles(prefix: string, files: File[]): Promise<Doc[]> {
  return Promise.all(files.map(async file => {
    if (file.size > MAX_SIZE) throw new HttpError(413, `"${file.name}" passa de 25 MB.`)
    const path = `${prefix}/${crypto.randomUUID().slice(0, 8)}-${clean(file.name)}`
    await putFile(path, Buffer.from(await file.arrayBuffer()), file.type || 'application/octet-stream')
    return { name: file.name, size: file.size, path }
  }))
}

export const filesOf = (form: FormData, field = 'files') => form.getAll(field).filter((v): v is File => typeof v !== 'string' && v.size > 0)
