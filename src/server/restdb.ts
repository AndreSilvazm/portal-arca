// Firestore acessado pela API REST com a chave web do projeto (FIREBASE_API_KEY), sem conta de serviço.
// Imita o mesmo subconjunto do Firestore que localdb.ts, então as rotas não mudam.
// Depende das regras do Firestore permitirem o acesso; todo o controle de quem pode o quê fica nas rotas do servidor.

type Doc = Record<string, unknown>
type Increment = { __inc: number }
type Value = Record<string, unknown>
type Write = Record<string, unknown>

const project = () => process.env.FIREBASE_PROJECT_ID!
const key = () => process.env.FIREBASE_API_KEY!
const ROOT = () => `projects/${project()}/databases/(default)/documents`
const URL_ROOT = () => `https://firestore.googleapis.com/v1/${ROOT()}`

const isIncrement = (v: unknown): v is Increment => typeof v === 'object' && v !== null && '__inc' in v
const newId = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36)

function encode(v: unknown): Value {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  return { mapValue: { fields: encodeFields(v as Doc) } }
}

function encodeFields(data: Doc): Record<string, Value> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && !isIncrement(v)).map(([k, v]) => [k, encode(v)]))
}

function decode(v: Value): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return ((v.arrayValue as { values?: Value[] }).values ?? []).map(decode)
  if ('mapValue' in v) return decodeFields((v.mapValue as { fields?: Record<string, Value> }).fields ?? {})
  return null
}

const decodeFields = (fields: Record<string, Value>): Doc => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]))

class HttpFailure extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function call(url: string, init: RequestInit = {}) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}key=${key()}`, { ...init, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' })
  if (res.status === 404 && init.method !== 'POST') return null
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new HttpFailure(res.status, body?.error?.message ?? `Firestore respondeu ${res.status}`)
  return body
}

const fieldPath = (k: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `\`${k.replace(/`/g, '\\`')}\``)

class DocSnap {
  constructor(public ref: DocRef, private value: Doc | undefined) {}
  get id() { return this.ref.id }
  get exists() { return this.value !== undefined }
  data() { return this.value === undefined ? undefined : (JSON.parse(JSON.stringify(this.value)) as Doc) }
}

const fromRest = (d: { name: string; fields?: Record<string, Value> }) => new DocSnap(new DocRef(d.name.slice(ROOT().length + 1)), decodeFields(d.fields ?? {}))

const setWrite = (path: string, data: Doc): Write => ({ update: { name: `${ROOT()}/${path}`, fields: encodeFields(data) } })

function updateWrite(path: string, patch: Doc): Write {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined)
  const plain = entries.filter(([, v]) => !isIncrement(v))
  const incs = entries.filter(([, v]) => isIncrement(v)) as Array<[string, Increment]>
  return {
    update: { name: `${ROOT()}/${path}`, fields: encodeFields(Object.fromEntries(plain)) },
    updateMask: { fieldPaths: plain.map(([k]) => fieldPath(k)) },
    ...(incs.length ? { updateTransforms: incs.map(([k, v]) => ({ fieldPath: fieldPath(k), increment: { integerValue: String(v.__inc) } })) } : {}),
    currentDocument: { exists: true },
  }
}

const commit = (writes: Write[], transaction?: string) =>
  call(`${URL_ROOT()}:commit`, { method: 'POST', body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) }) })

class DocRef {
  constructor(public path: string) {}
  get id() { return this.path.split('/').pop()! }
  async get(tx?: string) {
    const found = await call(`${URL_ROOT()}/${this.path}${tx ? `?transaction=${encodeURIComponent(tx)}` : ''}`)
    return found ? fromRest(found) : new DocSnap(this, undefined)
  }
  async set(data: Doc) { await commit([setWrite(this.path, data)]) }
  async update(patch: Doc) { await commit([updateWrite(this.path, patch)]) }
  async delete() { await commit([{ delete: `${ROOT()}/${this.path}` }]) }
  collection(name: string) { return new CollectionRef(`${this.path}/${name}`) }
}

type Filter = [string, unknown]

class Query {
  constructor(protected path: string, protected filters: Filter[] = [], protected max = Infinity) {}
  where(field: string, op: string, value: unknown) {
    if (op !== '==') throw new Error('Só há suporte para where(..., "==", ...)')
    return new Query(this.path, [...this.filters, [field, value]], this.max)
  }
  limit(n: number) { return new Query(this.path, this.filters, n) }
  async get() {
    const parts = this.path.split('/')
    const collectionId = parts.pop()!
    const parent = parts.join('/')
    const structuredQuery = {
      from: [{ collectionId }],
      ...(this.filters.length ? { where: { compositeFilter: { op: 'AND', filters: this.filters.map(([field, v]) => ({ fieldFilter: { field: { fieldPath: fieldPath(field) }, op: 'EQUAL', value: encode(v) } })) } } } : {}),
      ...(Number.isFinite(this.max) ? { limit: this.max } : {}),
    }
    const rows = (await call(`${URL_ROOT()}${parent ? `/${parent}` : ''}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery }) })) as Array<{ document?: { name: string; fields?: Record<string, Value> } }>
    const docs = rows.filter(r => r.document).map(r => fromRest(r.document!))
    return { docs, empty: docs.length === 0, size: docs.length }
  }
}

class CollectionRef extends Query {
  doc(id?: string) { return new DocRef(`${this.path}/${id ?? newId()}`) }
  async add(data: Doc) { const ref = this.doc(); await ref.set(data); return ref }
}

export const restIncrement = (n: number): Increment => ({ __inc: n })

export const restDb = {
  collection: (name: string) => new CollectionRef(name),
  doc: (p: string) => new DocRef(p),
  async getAll(...refs: DocRef[]) {
    const rows = (await call(`${URL_ROOT()}:batchGet`, { method: 'POST', body: JSON.stringify({ documents: refs.map(r => `${ROOT()}/${r.path}`) }) })) as Array<{ found?: { name: string; fields?: Record<string, Value> } }>
    const byPath = new Map(rows.filter(r => r.found).map(r => { const s = fromRest(r.found!); return [s.ref.path, s] }))
    return refs.map(r => byPath.get(r.path) ?? new DocSnap(r, undefined))
  },
  batch() {
    const writes: Write[] = []
    return {
      set(ref: DocRef, data: Doc) { writes.push(setWrite(ref.path, data)) },
      async commit() { if (writes.length) await commit(writes) },
    }
  },
  // Sem credencial de servidor a API não abre transação (beginTransaction é negado). No lugar, as leituras são
  // comuns e todas as gravações vão em UM commit atômico; `set` aqui só CRIA (falha com 409 se o documento já
  // existir). Assim o registro de participação continua impedindo voto repetido, mesmo com dois cliques simultâneos.
  async runTransaction<T>(fn: (tx: { get: (r: DocRef) => Promise<DocSnap>; set: (r: DocRef, d: Doc) => void; update: (r: DocRef, d: Doc) => void }) => Promise<T>) {
    const writes: Write[] = []
    const result = await fn({
      get: r => r.get(),
      set: (r, d) => { writes.push({ ...setWrite(r.path, d), currentDocument: { exists: false } }) },
      update: (r, d) => { writes.push(updateWrite(r.path, d)) },
    })
    if (writes.length) await commit(writes)
    return result
  },
}
