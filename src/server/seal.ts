import { createHash } from 'node:crypto'
import { db } from './db'
import { optionKeys, outcomeOf, voteOptions } from '@/lib/shared'

type PollData = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

// Lacra o resultado da votação: grava no Firestore a apuração final e um hash SHA-256 do registro da votação
// (pauta, público, prazos e apuração). O registro nunca contém quem votou, só a contagem. Depois de gravado não muda.
export async function sealPoll(id: string, poll: PollData, tally: PollData) {
  const counts = Object.fromEntries(optionKeys.map(k => [k, Number(tally[k] ?? 0)]))
  const total = Number(tally.total ?? 0)
  const closedAt: string = poll.closedAt ?? poll.endsAt
  const record = {
    v: 1,
    id,
    title: poll.title,
    description: poll.description,
    documents: (poll.documents ?? []).map((d: PollData) => ({ name: d.name, size: d.size, path: d.path })),
    audience: { all: !!poll.audience.all, groups: [...poll.audience.groups].sort() },
    releasedAt: poll.releasedAt,
    endsAt: poll.endsAt,
    closedAt,
    result: { ...counts, total },
  }
  const resultHash = createHash('sha256').update(JSON.stringify(record)).digest('hex')
  const outcome = outcomeOf(Object.fromEntries(voteOptions.map((label, i) => [label, counts[optionKeys[i]]])))
  const sealed = { result: { ...counts, total, outcome }, resultHash, sealedAt: new Date().toISOString() }
  await db().collection('polls').doc(id).update(sealed)
  return sealed
}
