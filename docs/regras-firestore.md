# Regras de segurança do Firestore e do Storage

Como o login é próprio, o navegador **não** acessa o banco diretamente: tudo passa pelas rotas `/api` do servidor, que usam a conta de serviço (o Admin SDK ignora as regras). Por isso as regras só precisam **negar tudo** a qualquer acesso vindo de fora.

## Firestore (Regras → Publicar)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Cloud Storage (Regras → Publicar)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Onde fica a autorização de verdade

Na camada de API (`src/server/` e `src/app/api/`):

| Regra | Onde |
|---|---|
| Só a Secretaria cria/edita/apaga membros, publicações, assembleias, documentos, votações e permissões | `requireUser(req, { admin: true })` em cada rota de escrita |
| Cada pessoa só recebe o que o grupo dela pode ver (publicações por tipo, pastas, assembleias, votações) | `GET /api/state` filtra pelas permissões |
| Arquivos só para quem vê a tela correspondente | `GET /api/files` confere o prefixo do caminho e redireciona para um link assinado de 2 minutos |
| Voto único, só com a votação aberta, só para a audiência | transação em `POST /api/polls/[id]/vote` |
| Sigilo da apuração | o servidor só envia a divisão dos votos depois do encerramento; antes, nem a Secretaria a recebe (só o total de participantes) |
| Sessão | JWT em cookie httpOnly, revalidado contra o banco a cada requisição |

## Cuidados

- Mantenha estas regras de **negar tudo**. Abrir leitura/escrita direta no Firestore ou no Storage contornaria toda a autorização acima.
- A chave da conta de serviço dá acesso total e ignora as regras: guarde-a como segredo e nunca a envie ao navegador ou ao git.
- Quem tem acesso ao console do Firebase vê os dados brutos (inclusive a contagem parcial dos votos). Restrinja o acesso ao console.
