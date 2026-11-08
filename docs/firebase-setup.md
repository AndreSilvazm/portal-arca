# Configuração (Firebase como banco e arquivos)

## Modo local (sem Firebase) — padrão no desenvolvimento

Sem credenciais do Firebase no `.env.local`, o servidor usa um banco local em arquivo: `.data/db.json` (dados) e `.data/files/` (anexos). A pasta está no `.gitignore`. Serve só para desenvolver e testar; **não use em produção**.

```bash
npm install
node scripts/criar-admin.mjs      # cria a conta da Secretaria no banco local
npm run dev                       # http://localhost:3000/login
```

**Modo REST (sem conta de serviço):** com `FIREBASE_API_KEY` e `FIREBASE_PROJECT_ID` no `.env.local`, o servidor lê e grava no Firestore pela API REST com a chave web do projeto, sem arquivo de chave (veja `src/server/restdb.ts`). Exige que as regras do Firestore permitam o acesso e **não** usa o Storage: os anexos continuam em `.data/files`. O voto único continua garantido (um commit atômico que só cria a participação se ela ainda não existir). Para voltar ao banco em arquivo, use `USE_LOCAL_DB=true`.

Para passar ao Firestore/Storage com conta de serviço, siga os passos abaixo e descomente `GOOGLE_APPLICATION_CREDENTIALS` no `.env.local`. Os dados do modo local **não são migrados** automaticamente.

---

O portal usa o Firebase **só como Firestore e Storage**, acessados pelo servidor com uma conta de serviço. O login é próprio (veja [autenticacao.md](autenticacao.md)): **não** é preciso habilitar o Firebase Authentication.

Projeto: `portal-arcanimal`.

## 1. Criar o Firestore

Console do Firebase → **Firestore Database** → **Criar banco de dados** → modo **produção** → região (ex.: `southamerica-east1`).

Aplique as regras de [regras-firestore.md](regras-firestore.md): **negar todo acesso direto**. Só o servidor (que usa a conta de serviço e ignora as regras) lê e grava.

## 2. Criar o Storage

**Storage** → **Começar** → mesma região. Aplique as regras de negar tudo (mesmo documento). Dependendo do plano, o Google pode exigir o Blaze para criar o bucket.

## 3. Chave da conta de serviço

**Configurações do projeto → Contas de serviço → Gerar nova chave privada.** Salve como `chave-servico.json` na raiz do projeto. Ela já está no `.gitignore`; **nunca** a versione nem a compartilhe — dá acesso total ao projeto.

## 4. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```
AUTH_SECRET=                      # segredo do JWT, mínimo 32 caracteres aleatórios
FIREBASE_PROJECT_ID=portal-arcanimal
FIREBASE_STORAGE_BUCKET=portal-arcanimal.firebasestorage.app
GOOGLE_APPLICATION_CREDENTIALS=./chave-servico.json
```

Em vez do arquivo, pode-se usar `FIREBASE_SERVICE_ACCOUNT` com o JSON da chave inteiro em uma linha.

## 5. Criar o primeiro administrador

O primeiro admin não pode ser criado pela interface. Rode uma vez, na raiz do projeto (no modo local não precisa de chave; no Firestore use a chave de serviço):

```bash
# bash
GOOGLE_APPLICATION_CREDENTIALS=./chave-servico.json node scripts/criar-admin.mjs
# PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS="./chave-servico.json"; node scripts/criar-admin.mjs
```

O script pergunta o e-mail e a senha (mínimo 8 caracteres; não aparece na tela), grava em `users` a conta **André Simão — Diretor de Secretaria — Diretoria Executiva — admin** com a senha em hash e imprime a confirmação. Se o e-mail já existir, atualiza a senha e derruba as sessões antigas.

## 6. Rodar

```bash
npm install
npm run dev     # http://localhost:3000/login
```

Na primeira entrada, o servidor usa as permissões padrão dos grupos; a Secretaria grava ajustes em **Administração → Permissões**.

## Cadastrar as demais pessoas

**Administração → Membros** → nome, e-mail, cargo e grupo. O portal gera uma senha provisória, mostra-a uma vez e exige que a pessoa a troque no primeiro acesso.

## Observações

- O portal precisa de um servidor Node (as rotas `/api` rodam no servidor). Onde hospedar é decisão da infraestrutura.
- Apague o `chave-servico.json` do computador quando não precisar mais rodar o script; em produção, entregue a chave por variável de ambiente/segredo do ambiente, nunca no código.
