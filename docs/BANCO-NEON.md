# Banco de dados do GTM Hub com Neon

Camada de banco da Fase 1 do Hub: sócios, leads, diagnósticos e histórico.
Usa Neon (PostgreSQL) com Drizzle, que gera as tabelas a partir do arquivo
`src/db/schema.ts`.

## O que tem aqui

| Arquivo | Para que serve |
| --- | --- |
| `src/db/schema.ts` | Definição das tabelas |
| `src/db/index.ts` | Conexão com o Neon |
| `src/db/consultas/leads.ts` | Funções prontas do funil (listar, criar, mover de etapa, salvar diagnóstico) |
| `src/db/seed.ts` | Cadastro inicial dos sócios |
| `src/db/testar-conexao.ts` | Teste rápido da conexão |
| `drizzle/` | Migração inicial em SQL, já gerada |
| `drizzle.config.ts` | Configuração das migrações |
| `.env.example` | Modelo das variáveis de ambiente |

## Passo a passo

1. **Criar o banco no Neon.** Em neon.com, crie um projeto (região São Paulo,
   se disponível, para ficar mais rápido). No painel, abra "Connect" e copie
   as duas conexões: a "pooled" e a direta.
2. **Colocar os arquivos no projeto.** Copie as pastas `src/db` e `drizzle` e o
   arquivo `drizzle.config.ts` para a raiz do repositório do Hub.
3. **Instalar os pacotes.**
   ```bash
   npm install drizzle-orm @neondatabase/serverless
   npm install -D drizzle-kit tsx
   ```
4. **Copiar os comandos.** Acrescente ao `package.json` do Hub os itens de
   `scripts` que começam com `db:` (estão no `package.json` desta pasta).
5. **Configurar as variáveis.** Copie `.env.example` para `.env.local` e cole as
   duas conexões e a lista de sócios. Confira que `.env.local` está no
   `.gitignore`.
6. **Criar as tabelas.**
   ```bash
   npm run db:migrar
   ```
7. **Cadastrar os sócios e testar.**
   ```bash
   npm run db:socios
   npm run db:testar
   ```
   O teste deve mostrar a hora do banco e 3 sócios.

## Como usar no código

```ts
import { listarFunil, criarLead } from "@/db/consultas/leads";

const funil = await listarFunil();
```

Use sempre no servidor (rotas, server actions). A conexão nunca vai para o
navegador.

## Quando mudar uma tabela

1. Edite `src/db/schema.ts`.
2. Rode `npm run db:gerar` para criar a nova migração.
3. Revise o SQL gerado em `drizzle/`.
4. Rode a migração como no passo 6.

Dica do Neon: antes de migrar o banco de produção, crie uma "branch" no painel,
teste a migração nela e só então aplique na principal.

## O que o Neon não cobre

- **Login:** o Neon só guarda os dados. O login com Google precisa de uma
  biblioteca à parte (por exemplo, Auth.js) que confere se o e-mail está na
  tabela `socios`.
- **Arquivos:** PDFs de editais, contratos e áudios precisam de um serviço de
  armazenamento à parte (por exemplo, Cloudflare R2 ou Vercel Blob).
- **Regras de acesso:** como só o servidor fala com o banco, quem garante que
  apenas sócios logados acessam os dados é o código do servidor. Toda rota
  deve conferir o login antes de consultar.

## O que foi verificado

- O código passa na verificação de tipos.
- A migração foi executada num PostgreSQL de teste local: as tabelas são
  criadas e um lead sem próximo passo é recusado.
- Não foi testado contra uma conta real do Neon. O primeiro `npm run db:testar`
  de vocês é esse teste.
