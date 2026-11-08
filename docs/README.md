# Portal Arcanimal — documentação

Portal institucional do Instituto Arcanimal: site público e área de membros (feed, votações, assembleias, documentos) com administração exclusiva da Secretaria.

| Documento | Conteúdo |
|---|---|
| [firebase-setup.md](firebase-setup.md) | Configurar Firestore/Storage, variáveis de ambiente e criar o primeiro administrador |
| [modelo-de-dados.md](modelo-de-dados.md) | Coleções do Firestore, campos e relacionamentos |
| [regras-firestore.md](regras-firestore.md) | Regras do Firestore/Storage (negar tudo) e onde fica a autorização |
| [autenticacao.md](autenticacao.md) | Tabela de usuários, hash de senha, JWT e proteções do login |
| [permissoes.md](permissoes.md) | Papéis, grupos e telas liberadas |
| [roadmap.md](roadmap.md) | Estado atual e próximos passos |

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Autenticação própria: senha com hash (scrypt) + JWT em cookie httpOnly
- Firebase como banco (**Firestore**) e arquivos (**Storage**), acessado só pelo servidor (Admin SDK)
- `jspdf` para o PDF de resultado de votação (template em `public/templates-pdf/`)

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # AUTH_SECRET e credenciais do Firebase (veja firebase-setup.md)
node scripts/criar-admin.mjs     # cria a conta da Secretaria (banco local em .data/)
npm run dev                  # http://localhost:3000
```

As variáveis ficam em `.env.local` (ignorado pelo git). `AUTH_SECRET` assina os JWT; a chave da conta de serviço do Firebase dá acesso total ao banco — ambos são segredos de servidor e nunca vão ao navegador.

## Estrutura

```
src/app/                 rotas (site público, /login, /membros/...)
src/app/membros/admin    administração (somente Secretaria)
src/components/          shell da área de membros, formulários, votações
src/app/api/             rotas de API (auth, state, members, posts, polls, ...)
src/server/              servidor: banco (Admin SDK), sessão JWT, hash de senha, arquivos
src/lib/store.tsx        estado do navegador (chama a API)
scripts/criar-admin.mjs  cria a conta da Secretaria
src/lib/resultPdf.ts     geração do PDF de resultado
public/templates-pdf/    template do PDF
```

## Convenções

- Texto da interface em português; `**negrito**` nas descrições é renderizado como elemento React, nunca como HTML.
- Toda autorização é feita no servidor (rotas `/api`). O front só esconde o que a pessoa não pode usar.
