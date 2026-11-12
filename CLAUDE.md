# GTM Hub — guia do repositório

Sistema interno da GTM Soluções (3 sócios). Interface em pt-BR, moeda BRL,
datas dd/mm/aaaa, fuso America/Sao_Paulo. Especificação completa em `docs/PROMPT-GTM-HUB.md`.

## Stack
Next.js 16 App Router + TypeScript, Tailwind 4 (tokens em `src/app/globals.css`),
Neon + Drizzle (`src/db`, migrações em `drizzle/`), Auth.js v5 com Google (`src/auth.ts`),
Recharts, Zod, Vitest.

## Pastas
- `src/app/(painel)/` — telas autenticadas (uma pasta por módulo). `layout.tsx` monta menu lateral / barra inferior.
- `src/app/login/` — tela de entrada.
- `src/components/ui/` — componentes base (botão, campo, cartão, tabela, etiqueta, modal, aviso, estados vazio/erro/carregando). **Use-os em toda tela.**
- `src/components/graficos.tsx` — gráficos (paleta validada para daltonismo).
- `src/lib/regras/` — regras de negócio puras, com testes em `regras.test.ts`.
- `src/lib/repositorio.ts` — único acesso a dados: Neon quando `DATABASE_URL` existe, memória (demo) quando não.
- `src/lib/sessao.ts` — `exigirSocio()`: chame no início de toda página, rota e server action.
- `src/lib/demo/dados.ts` — dados fictícios da demonstração.
- `src/db/` — schema, conexão e consultas (padrão: toda alteração grava no `historico` no mesmo `db.batch`).

## Comandos
`npm run dev` · `npm run build` · `npm run tipos` · `npm test` · `npm run db:gerar|db:migrar|db:socios|db:testar`

## Convenções
- Só o servidor acessa o banco. Toda entrada validada com Zod (`src/lib/regras`).
- Situações sempre com ícone + texto (`<Etiqueta>`), nunca só cor.
- Alvos de toque ≥ 44 px (`min-h-11`), foco visível, rótulo em todo campo.
- Toda tela tem estado vazio, de carregamento (`loading.tsx`) e de erro (`error.tsx`).
- Conferir cada tela em 390 px e 1440 px.
- Nenhum dado real em testes ou na demonstração.
- Não instalar dependência sem justificar; problemas fora da etapa vão para `docs/PENDENCIAS.md`.
