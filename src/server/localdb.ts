// Banco local em arquivo (.data/db.json) que imita o subconjunto do Firestore usado pelo portal.
// Serve para desenvolver e testar sem credenciais do Firebase. NÃO é para produção.
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), '.data')
const FILE = path.join(DATA_DIR, 'db.json')

type Doc = Record<string, unknown>
type Store = Record<string, Doc> // caminho completo do documento -> dados
type Increment = { __inc: number }

const g = globalThis as unknown as { __localdb?: { store: Store; mtime: number }; __localdbLock?: Promise<unknown> }

// Relê o arquivo se outro processo (ex.: o script de criação do admin) o alterou.
function store(): Store {
  let mtime = 0
  try { mtime = fs.statSync(FILE).mtimeMs } catch {}
  if (!g.__localdb || g.__localdb.mtime !== mtime) {
    let data: Store = {}
    try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch {}
    g.__localdb = { store: data, mtime }
  }
  return g.__localdb.store
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(g.__localdb!.store, null, 1))
  g.__localdb!.mtime = fs.statSync(FILE).mtimeMs
}

export const localIncrement = (n: number): Increment => ({ __inc: n })
const isIncrement = (v: unknown): v is Increment => typeof v === 'object' && v !== null && '__inc' in v

function applyPatch(old: Doc, patch: Doc): Doc {
  const next = { ...old }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    next[key] = isIncrement(value) ? Number(old[key] ?? 0) + value.__inc : value
  }
  return next
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null))
const newId = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36)

class DocSnap {
  constructor(public ref: DocRef, private value: Doc | undefined) {}
  get id() { return this.ref.id }
  get exists() { return this.value !== undefined }
  data() { return this.value === undefined ? undefined : clone(this.value) }
}

class DocRef {
  constructor(public path: string) {}
  get id() { return this.path.split('/').pop()! }
  async get() { return new DocSnap(this, store()[this.path]) }
  async set(data: Doc) { store()[this.path] = applyPatch({}, data); save() }
  async update(patch: Doc) {
    const current = store()[this.path]
    if (!current) throw new Error(`Documento inexistente: ${this.path}`)
    store()[this.path] = applyPatch(current, patch); save()
  }
  async delete() { delete store()[this.path]; save() }
  collection(name: string) { return new CollectionRef(`${this.path}/${name}`) }
}

type Filter = [string, unknown]

class Query {
  constructor(protected path: string, protected filters: Filter[] = [], protected max = Infinity) {}
  where(field: string, op: string, value: unknown) {
    if (op !== '==') throw new Error('Banco local só suporta where(..., "==", ...)')
    return new Query(this.path, [...this.filters, [field, value]], this.max)
  }
  limit(n: number) { return new Query(this.path, this.filters, n) }
  async get() {
    const prefix = `${this.path}/`
    const docs = Object.entries(store())
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .filter(([, value]) => this.filters.every(([field, expected]) => value[field] === expected))
      .slice(0, this.max)
      .map(([key, value]) => new DocSnap(new DocRef(key), value))
    return { docs, empty: docs.length === 0, size: docs.length }
  }
}

class CollectionRef extends Query {
  doc(id?: string) { return new DocRef(`${this.path}/${id ?? newId()}`) }
  async add(data: Doc) { const ref = this.doc(); await ref.set(data); return ref }
}

export const localDb = {
  collection: (name: string) => new CollectionRef(name),
  doc: (p: string) => new DocRef(p),
  getAll: (...refs: DocRef[]) => Promise.all(refs.map(r => r.get())),
  batch() {
    const ops: Array<() => Promise<void>> = []
    return {
      set(ref: DocRef, data: Doc) { ops.push(() => ref.set(data)) },
      async commit() { for (const op of ops) await op() },
    }
  },
  // Transações em série (um processo só): o voto lê, confere e grava sem intercalar com outro voto.
  async runTransaction<T>(fn: (tx: { get: (r: DocRef) => Promise<DocSnap>; set: (r: DocRef, d: Doc) => void; update: (r: DocRef, d: Doc) => void }) => Promise<T>) {
    const previous = g.__localdbLock ?? Promise.resolve()
    const run = previous.then(async () => {
      const writes: Array<() => Promise<void>> = []
      const result = await fn({
        get: r => r.get(),
        set: (r, d) => { writes.push(() => r.set(d)) },
        update: (r, d) => { writes.push(() => r.update(d)) },
      })
      for (const write of writes) await write()
      return result
    })
    g.__localdbLock = run.catch(() => undefined)
    return run
  },
}

// --- Arquivos (equivalente ao Storage) ---
const FILES_DIR = path.join(DATA_DIR, 'files')
const safe = (p: string) => path.join(FILES_DIR, path.normalize(p).replace(/^(\.\.[/\\])+/, ''))

export async function localPutFile(filePath: string, data: Buffer) {
  const target = safe(filePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, data)
}

export async function localReadFile(filePath: string): Promise<Buffer | null> {
  const target = safe(filePath)
  return target.startsWith(FILES_DIR) && fs.existsSync(target) ? fs.readFileSync(target) : null
}
