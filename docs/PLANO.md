# Plano de desenvolvimento

Legenda: ✅ pronto · 🟡 tela pronta com dados de demonstração · ⬜ a fazer

## Fase 1 — Base, design, acesso, equipe e histórico
- ✅ Projeto Next.js + Tailwind com tokens da marca (grafite, off-white, areia, azuis, Lexend)
- ✅ Componentes base: botão, campo, cartão, métrica, tabela, etiqueta de situação, modal, aviso, toast, estados vazio/erro/carregando, medidor
- ✅ Estrutura: menu lateral escuro (computador) e barra inferior + menu "Mais" (celular)
- ✅ Login por e-mail e senha individual (hash scrypt na tabela `socios`, script `db:senha`); modo demonstração local quando não configurado
- ✅ Sócios e histórico lidos do Neon quando `DATABASE_URL` existe
- ✅ Camada Neon/Drizzle incorporada (`src/db`, `drizzle/`)
- ✅ Equipe (sócios do Neon)
- ✅ Histórico com filtros (tabela `historico` do Neon)
- ⬜ Tela "Minha senha" para cada sócio trocar a própria senha

## Fase 2 — Leads, diagnóstico e análise
- ✅ Funil em 7 colunas, arrastar e soltar + seletor "Mover para" (celular/teclado)
- ✅ Regra: dono, próximo passo e data obrigatórios (Zod no servidor); motivo obrigatório em Perdido
- ✅ Cards parados há mais de 7 dias marcados
- ✅ Leads e mudanças de etapa gravam no Neon quando `DATABASE_URL` existe (com histórico no mesmo lote)
- ✅ Editar lead (dados, dono, próximo passo, data e valores da proposta), com histórico
- ✅ Ficha do cliente com contatos, diagnósticos e proposta reais (projetos, contratos e pagamentos ainda de demonstração)
- ✅ Checklist de visita em 6 seções: rascunho no aparelho (funciona sem sinal) e botão Salvar que grava no banco, com pontuação recalculada no servidor
- ✅ Pontuação 0–100 (5 fatores, pesos), veredito, complexidade e calculadora de economia
- ⬜ Enviar o rascunho sozinho ao voltar o sinal (hoje o sócio toca em Salvar); pesos em tabela editável
- ⬜ Saídas com IA (resumo, proposta, PRD) via módulo único no servidor
- ✅ Painel de análise calculado dos leads reais (conversão, dias na etapa atual, origem, segmento, perdas, calibração)
- ⬜ Guardar a data de cada mudança de etapa para medir tempo médio por etapa e em que etapa o lead foi perdido

## Fase 3 — Editais e radar
- 🟡 Lista com situação e veredito; ficha com requisitos × Perfil GTM (página + trecho), cronograma, critérios
- ✅ Regras: sem página → Verificar; veredito Apto / Apto com ajustes / Não apto
- ⬜ Entrada por link/PDF, armazenamento S3/R2, leitura com IA por partes, radar semanal

## Fase 4 — Agenda e projetos
- ✅ Agenda semana/mês com filtro por sócio, criar e excluir eventos
- 🟡 Projetos com situação, dono, prazo, repositório e progresso
- 🟡 Google Agenda por conta de serviço: leitura ao vivo, criar e excluir (falta a credencial — docs/GOOGLE-AGENDA.md)

## Fase 5 — Financeiro
- 🟡 Saldo, entradas/saídas, mensalidades, extrato, custos fixos, divisão entre sócios, teto do MEI
- ✅ Regras: situação de mensalidade, conciliação automática, divisão sem perder centavos, MEI proporcional com alerta em 80%
- ⬜ `ProvedorBancario` (demo + Inter, somente leitura), conciliação manual, planilha do contador

## Fase 6 — Contratos, produtos e início
- ✅ Início com resumo do dia
- ✅ Contratos no Neon: cadastrar, editar, encerrar, alerta de renovação e vencidos
- ✅ Nossa empresa: cadastro (CNPJ, e-mail, telefone, Pix), sócios, resumo financeiro, contratos e agenda da semana
- 🟡 Catálogo de produtos
- ⬜ Modelo de contrato preenchido, upload do PDF assinado

## Fase 7 — Automação
- 🟡 Caixa de aprovações (aprovar/editar/recusar) e painel de agentes com custo × teto
- ⬜ Persistir decisões, API com chave para o n8n

## Como testar
`npm test` (regras), `npm run tipos`, `npm run build`, e conferir as telas em 390 px e 1440 px.
