# Modelo de dados (Firestore e Storage)

Acessado só pelo servidor. Datas são texto ISO 8601.

## `users/{id}` — tabela de usuários

| Campo | Tipo | Observação |
|---|---|---|
| `name` | string | |
| `email` | string | minúsculas, único |
| `role` | string | cargo/função exibido |
| `group` | string | `Diretoria Executiva`, `Conselho Fiscal`, `Associados`, `Colaboradores`, `Voluntários` |
| `active` | boolean | `false` bloqueia o login e derruba sessões |
| `admin` | boolean | `true` só para a Secretaria |
| `passwordHash` | string | `scrypt$N$r$p$salt$hash` — **nunca** vai ao navegador |
| `mustChangePassword` | boolean | `true` com senha provisória; a API só aceita a troca de senha |
| `tokenVersion` | number | sobe ao trocar/redefinir senha ou desativar; invalida JWT antigos |
| `createdAt` | string | |

## `settings/permissions`

Um campo por grupo com a lista de telas liberadas: `{ "Colaboradores": ["Feed", "Comunicados", "Documentos"], ... }`. Se não existir, vale o padrão do código (`defaultPermissions`).

## `posts/{id}`

`type` (`Comunicado oficial` | `Decisão` | `Ata de reunião`), `title`, `text` (com `**negrito**`), `files[]` (`{name, size, path}`), `author`, `createdAt`.

## `assemblies/{id}`

`kind`, `title`, `startsAt`, `place`, `agenda`, `createdAt`.

## `documents/{id}`

Arquivos enviados direto para uma pasta: `folder`, `name`, `size`, `path`, `createdAt`. As pastas *Atas*, *Decisões* e *Comunicados* também exibem os anexos de `posts` do tipo correspondente, e *Pautas de votação* os de `polls`.

## `polls/{id}`

| Campo | Observação |
|---|---|
| `title`, `description`, `meeting` | |
| `documents[]` | `{name, size, path}` |
| `opensAt` | abertura prevista (ISO, opcional) — só um lembrete para a Secretaria, **não abre sozinha** |
| `releasedAt` | `null` = **agendada** (só a Secretaria a vê; ninguém vota); ISO = liberada pela Secretaria aos membros |
| `endsAt` | prazo (ISO) |
| `closedAt` | `null` enquanto aberta; ISO quando a Secretaria encerra |
| `audience` | `{ all: boolean, groups: string[] }` |
| `createdAt` | |

**Ciclo de vida:** *agendada* (criada, invisível aos membros) → *aberta* (a Secretaria clicou em **Liberar**, dentro do prazo) → *encerrada* (a Secretaria encerrou ou o prazo venceu). A Secretaria pode excluir votação agendada ou encerrada (apaga também a apuração e os participantes); votação aberta precisa ser encerrada antes.

### `polls/{id}/participants/{userId}`

`votedAt`. **Registra quem participou, nunca em quê votou.** Impede voto repetido.

### `polls/{id}/tally/counts`

`{ aprovo, rejeito, abstencao, total }` — contagem agregada, atualizada na mesma transação que cria a participação. O servidor só a envia ao navegador depois do encerramento.

## Cloud Storage

Caminhos que indicam a tela de acesso: `posts/{comunicados|decisoes|atas}/…`, `polls/…`, `documents/{atas|decisoes|comunicados|pautas|institucional}/…`, cada arquivo com prefixo aleatório. O download passa por `GET /api/files`, que confere a permissão e redireciona para um link assinado de 2 minutos.

## Consultas

Todas as consultas usam um único `where` de igualdade (ou nenhum), então **nenhum índice composto é necessário**; a ordenação é feita no servidor.
