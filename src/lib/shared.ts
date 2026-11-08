// Constantes e tipos usados pelo navegador e pelo servidor (rotas de API).
import type { Group } from './data'

export const screens = ['Feed', 'Votações', 'Comunicados', 'Assembleias', 'Documentos', 'Decisões', 'Eleições e resultados'] as const
export type Screen = (typeof screens)[number]
export type Permissions = Record<Group, Screen[]>

// Padrão de cada grupo; a Secretaria pode ajustar na Administração. O Feed é sempre liberado.
export const defaultPermissions: Permissions = {
  'Diretoria Executiva': [...screens],
  'Conselho Fiscal': [...screens],
  'Associados': [...screens],
  'Colaboradores': ['Feed', 'Comunicados', 'Documentos'],
  'Voluntários': ['Feed', 'Comunicados'],
}

export type PostType = 'Comunicado oficial' | 'Decisão' | 'Ata de reunião'
export const postTypes: PostType[] = ['Comunicado oficial', 'Decisão', 'Ata de reunião']
export const postScreen: Record<PostType, Screen> = { 'Comunicado oficial': 'Comunicados', 'Decisão': 'Decisões', 'Ata de reunião': 'Documentos' }

export const folders = ['Atas de reunião', 'Decisões', 'Comunicados', 'Pautas de votação', 'Institucional'] as const
// Cada pasta só aparece para quem pode ver a tela correspondente.
export const folderScreen: Record<string, Screen> = { 'Atas de reunião': 'Documentos', 'Decisões': 'Decisões', 'Comunicados': 'Comunicados', 'Pautas de votação': 'Votações', 'Institucional': 'Documentos' }

export const voteOptions = ['Aprovo a pauta', 'Rejeito a pauta', 'Abstenção']
// Chaves estáveis no banco para cada opção (os rótulos podem mudar de texto sem quebrar a apuração).
// Maioria simples: compara aprovações e rejeições; abstenções não decidem.
export function outcomeOf(counts: Record<string, number>) {
  const yes = counts[voteOptions[0]] ?? 0
  const no = counts[voteOptions[1]] ?? 0
  if (!yes && !no && !(counts[voteOptions[2]] ?? 0)) return 'SEM VOTOS REGISTRADOS'
  if (yes === no) return 'EMPATE'
  return yes > no ? 'PAUTA APROVADA' : 'PAUTA REJEITADA'
}

export const optionKeys = ['aprovo', 'rejeito', 'abstencao']

export const assemblyKinds = ['Assembleia Geral Ordinária', 'Assembleia Geral Extraordinária', 'Reunião de Diretoria', 'Reunião de Conselho Fiscal'] as const

export type Doc = { name: string; size: number; path?: string }
export type StoredDoc = Doc & { id: string; folder: string; createdAt: string }
export type Account = { id: string; name: string; email: string; role: string; group: Group; active: boolean; admin: boolean }
export type Post = { id: string; type: PostType; title: string; text: string; createdAt: string; author: string; files: Doc[] }
export type Assembly = { id: string; kind: string; title: string; startsAt: string; place: string; agenda: string; createdAt: string }
export type Poll = {
  id: string
  title: string
  description: string
  documents: Doc[]
  meeting: string
  endsAt: string
  audience: { all: boolean; groups: Group[] }
  // Abertura prevista (só informativa) e momento em que a Secretaria liberou a votação para os membros.
  // Sem `releasedAt` a votação está agendada: só a Secretaria a vê e ninguém pode votar.
  opensAt?: string
  releasedAt?: string
  closedAt?: string
  createdAt: string
  // Selo do resultado, gravado no encerramento: hash SHA-256 do registro da votação (sai no PDF).
  resultHash?: string
  // Apuração: o servidor só envia depois do encerramento. `total` (participação) também vai para a Secretaria.
  counts: Record<string, number>
  total: number
  // Se a pessoa logada já votou. O voto é secreto: só registramos que participou, nunca a escolha.
  voted: boolean
}

// Pastas e caminhos de arquivo: o prefixo do caminho diz qual tela dá acesso ao arquivo.
export const postTypeSlug: Record<PostType, string> = { 'Comunicado oficial': 'comunicados', 'Decisão': 'decisoes', 'Ata de reunião': 'atas' }
export const folderSlug: Record<string, string> = { 'Atas de reunião': 'atas', 'Decisões': 'decisoes', 'Comunicados': 'comunicados', 'Pautas de votação': 'pautas', 'Institucional': 'institucional' }

export type StateResponse = {
  profile: (Account & { mustChangePassword: boolean }) | null
  permissions: Permissions
  accounts: Account[]
  posts: Post[]
  documents: StoredDoc[]
  polls: Poll[]
  assemblies: Assembly[]
}
