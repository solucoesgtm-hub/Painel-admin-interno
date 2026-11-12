# GTM Hub — painel interno da GTM Soluções

Sistema interno dos três sócios: funil de leads e clientes, diagnóstico de visita,
análise de leads, triagem de editais, projetos, contratos, produtos, financeiro,
agenda, automação, equipe e histórico de alterações.

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Neon (PostgreSQL) + Drizzle ·
Auth.js (e-mail e senha) · Recharts · Zod · Vitest.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem variáveis de ambiente, o Hub abre em **modo
demonstração**, com dados **fictícios** (todos os nomes de clientes terminam em
"(exemplo)"). Nada é gravado em banco nesse modo.

## Configurar dados reais

1. Copie `.env.example` para `.env.local` e preencha.
2. Banco: veja [docs/BANCO-NEON.md](docs/BANCO-NEON.md) (`npm run db:migrar`, `npm run db:socios`, `npm run db:testar`).
3. Login (e-mail e senha): preencha `AUTH_SECRET` (gere com `npx auth secret`) e defina a
   senha de cada sócio com `npm run db:senha -- email@do.socio` (Enter gera uma senha forte).
   As senhas ficam no banco só como hash (scrypt).

Em produção, sem o login configurado, o painel fica bloqueado (a demonstração só é
liberada com `PERMITIR_DEMO=1`).

## Comandos

| Comando | Para que serve |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run tipos` | Verificação de tipos |
| `npm test` | Testes das regras de negócio |
| `npm run db:*` | Migrações e cadastro dos sócios (ver docs) |
| `npm run db:senha -- email` | Define ou troca a senha de um sócio |

## Documentação

- [CLAUDE.md](CLAUDE.md) — stack, pastas e convenções
- [docs/PLANO.md](docs/PLANO.md) — fases e o que já está pronto
- [docs/PENDENCIAS.md](docs/PENDENCIAS.md) — credenciais e decisões em aberto
- [docs/PROMPT-GTM-HUB.md](docs/PROMPT-GTM-HUB.md) — especificação original
