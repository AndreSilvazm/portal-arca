import type { Doc } from './shared'

// O servidor confere a permissão e redireciona para um link assinado de curta duração.
export function openDoc(doc: Doc) {
  if (!doc.path) return
  window.open(`/api/files?path=${encodeURIComponent(doc.path)}`, '_blank', 'noopener')
}
