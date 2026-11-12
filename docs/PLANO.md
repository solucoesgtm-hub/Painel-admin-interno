# Plano de desenvolvimento

Legenda: ✅ pronto · 🟡 tela pronta com dados de demonstração · ⬜ a fazer

## Fase 1 — Base, design, acesso, equipe e histórico
- ✅ Projeto Next.js + Tailwind com tokens da marca (grafite, off-white, areia, azuis, Lexend)
- ✅ Componentes base: botão, campo, cartão, métrica, tabela, etiqueta de situação, modal, aviso, toast, estados vazio/erro/carregando, medidor
- ✅ Estrutura: menu lateral escuro (computador) e barra inferior + menu "Mais" (celular)
- ✅ Login Auth.js com Google restrito a `SOCIOS_EMAILS`; modo demonstração local quando não configurado
- ✅ Camada Neon/Drizzle incorporada (`src/db`, `drizzle/`)
- 🟡 Equipe (tela pronta; sócios ainda vêm da demonstração)
- 🟡 Histórico com filtros (tela pronta; consulta do Neon a ligar)

## Fase 2 — Leads, diagnóstico e análise
- ✅ Funil em 7 colunas, arrastar e soltar + seletor "Mover para" (celular/teclado)
- ✅ Regra: dono, próximo passo e data obrigatórios (Zod no servidor); motivo obrigatório em Perdido
- ✅ Cards parados há mais de 7 dias marcados
- ✅ Leads e mudanças de etapa gravam no Neon quando `DATABASE_URL` existe (com histórico no mesmo lote)
- 🟡 Ficha do cliente (contatos, diagnóstico, proposta, projetos, contratos, pagamentos)
- 🟡 Checklist de visita em 6 seções, salvo no aparelho a cada toque e funcionando sem sinal
- ✅ Pontuação 0–100 (5 fatores, pesos), veredito, complexidade e calculadora de economia
- ⬜ Sincronizar diagnóstico com o servidor ao voltar o sinal; pesos em tabela editável
- ⬜ Saídas com IA (resumo, proposta, PRD) via módulo único no servidor
- 🟡 Painel de análise (conversão, tempo por etapa, origem, segmento, perdas, calibração)

## Fase 3 — Editais e radar
- 🟡 Lista com situação e veredito; ficha com requisitos × Perfil GTM (página + trecho), cronograma, critérios
- ✅ Regras: sem página → Verificar; veredito Apto / Apto com ajustes / Não apto
- ⬜ Entrada por link/PDF, armazenamento S3/R2, leitura com IA por partes, radar semanal

## Fase 4 — Agenda e projetos
- 🟡 Agenda semana/mês com filtro por sócio
- 🟡 Projetos com situação, dono, prazo, repositório e progresso
- ⬜ Integração bidirecional com Google Agenda

## Fase 5 — Financeiro
- 🟡 Saldo, entradas/saídas, mensalidades, extrato, custos fixos, divisão entre sócios, teto do MEI
- ✅ Regras: situação de mensalidade, conciliação automática, divisão sem perder centavos, MEI proporcional com alerta em 80%
- ⬜ `ProvedorBancario` (demo + Inter, somente leitura), conciliação manual, planilha do contador

## Fase 6 — Contratos, produtos e início
- ✅ Início com resumo do dia
- 🟡 Contratos com vigência e alerta de renovação; catálogo de produtos
- ⬜ Modelo de contrato preenchido, upload do PDF assinado

## Fase 7 — Automação
- 🟡 Caixa de aprovações (aprovar/editar/recusar) e painel de agentes com custo × teto
- ⬜ Persistir decisões, API com chave para o n8n

## Como testar
`npm test` (regras), `npm run tipos`, `npm run build`, e conferir as telas em 390 px e 1440 px.
