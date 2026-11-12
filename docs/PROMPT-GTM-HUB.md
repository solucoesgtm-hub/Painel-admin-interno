# Prompt de desenvolvimento do GTM Hub (versão completa)

Cole este texto no Claude Code, dentro do repositório do projeto.
Antes, coloque em `docs/` o estudo do sistema exportado em Markdown e as imagens
dos protótipos de tela.

---

Você é o líder técnico do GTM Hub, o sistema interno de gestão da GTM Soluções.
A GTM é uma empresa de três sócios (Gabriel, Thalis e Mateus), em Marilândia, ES,
que vende automações com IA para comércios locais. Seu papel é orquestrar o
desenvolvimento do sistema inteiro: planejar, dividir em etapas, delegar a
subagentes quando ajudar, revisar o resultado e manter a documentação em dia.

O sistema completo está descrito abaixo. Ele é grande, então a qualidade depende
de construir em fases, com cada fase funcionando antes da seguinte. Planeje o
todo desde o início e implemente uma fase por vez.

## 1. Contexto e material de referência

- Leia tudo em `docs/` antes de qualquer decisão: o estudo do sistema (módulos,
  regras, agentes) e as imagens dos protótipos. Os protótipos definem a
  aparência e a organização das telas.
- Se já existe código no repositório, explore primeiro, relate o que encontrou
  e aproveite o que funciona. Mantenha a stack existente, salvo motivo forte.
- Usuários: só os três sócios. Todos são administradores, cada um com login
  próprio. Não há acesso público.
- Uso pelo celular durante visitas a clientes e pelo computador no resto do
  tempo. Toda tela precisa funcionar bem nos dois.
- Idioma da interface: português do Brasil. Moeda em reais, datas no formato
  dia/mês/ano, fuso America/Sao_Paulo.

## 2. Design

O design precisa ter nível profissional, de produto pronto para mostrar a clientes.

- Identidade: grafite #141620, off-white #F2F1EC, areia #E2DED6, azul #3F6FD8,
  azul claro #7FA2FF. Fonte Lexend. Arquivos da logo em `docs/marca/`.
- Estrutura: menu lateral escuro no computador, barra inferior no celular,
  área de conteúdo clara, cartões com borda fina.
- Defina os tokens (cores, espaçamentos, raios, tipografia) uma vez e use-os em
  tudo. Crie os componentes base antes das telas: botão, campo, cartão, tabela,
  etiqueta de situação, modal, aviso, estado vazio e estado de carregamento.
- Toda tela tem estado vazio, de carregamento e de erro, com texto útil.
- Acessibilidade: contraste AA, foco visível, rótulos em todos os campos,
  alvos de toque de pelo menos 44 px.
- Situações usam cor e texto juntos, nunca só cor.
- Depois de cada tela, confira o resultado em 390 px e em 1440 px de largura
  e compare com o protótipo correspondente.

## 3. Stack

Se o repositório estiver vazio:

- Next.js (App Router) com TypeScript e Tailwind.
- Banco: Neon (PostgreSQL) com Drizzle. A camada inicial já existe em `src/db`
  (schema, conexão, consultas do funil) e a primeira migração em `drizzle/`.
  Parta dela e mantenha o mesmo padrão: toda alteração grava no histórico no
  mesmo lote. Use SQL e migrações padrão, para o banco poder mudar de provedor.
- Login: Auth.js com Google. Só entra quem tem o e-mail na tabela `socios`.
- Arquivos: armazenamento compatível com S3 (por exemplo, Cloudflare R2),
  atrás de uma interface, com links temporários para leitura.
- Só o servidor acessa o banco. Toda rota e toda server action confere o login
  antes de consultar ou gravar.
- API do Claude para as funções de IA, chamada só pelo servidor. O nome do
  modelo fica em variável de ambiente.
- Validação de dados com esquema (por exemplo, Zod) em toda entrada e em toda
  resposta de IA.
- Testes: unitários para regras de negócio e de ponta a ponta para os fluxos
  principais.

## 4. Módulos e funcionalidades

### 4.1 Acesso e equipe
- Login com conta Google, restrito a uma lista de e-mails em variável de ambiente.
- Tela de equipe com os três sócios e a área de cada um.
- Histórico de alterações: toda criação, edição e exclusão registra quem fez
  (sócio ou agente), o quê e quando. Tela para consultar e filtrar.

### 4.2 Início
- Resumo do dia: faturamento do mês, mensalidades ativas, leads quentes,
  aprovações pendentes, próximos passos da semana por sócio, prazos de editais
  e uso do teto do MEI.

### 4.3 Leads e clientes
- Funil em colunas: Lead, Visita, Proposta, Fechado, Em desenvolvimento,
  Manutenção, além de Perdido.
- Todo card tem dono, próximo passo e data. Sem isso, não salva.
- Cards parados há mais de 7 dias ficam marcados.
- Ficha do cliente com contatos, origem do lead, diagnósticos, propostas,
  projetos, contratos e pagamentos.
- Ao marcar como Perdido, pedir o motivo.

### 4.4 Diagnóstico e análise de leads
- Checklist de visita em seis seções (negócio, ferramentas atuais, reclamações
  do sistema, tarefas manuais com peso, números, fechamento), feito para
  preencher com toques no celular. Salva a cada alteração e funciona sem sinal,
  sincronizando depois.
- Pontuação de 0 a 100 com cinco fatores (dor, orçamento, urgência, decisor,
  abertura), veredito Quente, Morno ou Frio e complexidade estimada. Os pesos
  ficam numa tabela de configuração editável.
- Saídas geradas com IA: resumo para os sócios, texto de proposta para o
  cliente e especificação técnica (PRD) para iniciar o projeto.
- Calculadora de economia: horas por semana vezes custo da hora.
- Painel de análise: conversão por etapa do funil, tempo médio em cada etapa,
  leads por origem e por segmento, motivos de perda, comparação entre a
  pontuação dada e o resultado real (fechou ou não), para calibrar os pesos.

### 4.5 Triagem de editais
- Perfil GTM: tipo de empresa, atividades, data de abertura, município,
  sócios e formação, faturamento, certidões com validade, projetos e estágio
  de cada um, editais já enviados.
- Entrada por link ou por envio de PDF. Baixar e guardar o arquivo original.
- Leitura completa com IA, incluindo anexos e retificações. Para documentos
  longos, processar por partes e consolidar.
- Ficha do edital: órgão, número, objeto, valor, público, região, cronograma,
  documentos exigidos, critérios de avaliação com pesos, vedações,
  contrapartidas e dúvidas a enviar ao órgão.
- Cada requisito de elegibilidade é comparado ao Perfil GTM e marcado como
  Atende, Não atende ou Verificar, sempre com a página do edital e o trecho
  que embasa a marcação. Sem página citada, a marcação é Verificar.
- Veredito: Apto, Apto com ajustes (com a lista do que falta) ou Não apto.
- Ao decidir aplicar, criar as tarefas com dono e data e enviar os prazos
  para a agenda.
- Lista de editais com situação (Em análise, Aplicando, Enviado, Descartado,
  Resultado), comparação lado a lado e banco de respostas reaproveitáveis.
- Radar: rotina semanal que verifica uma lista configurável de páginas de
  editais e traz os novos para a triagem.
- Aviso fixo na ficha: requisitos eliminatórios marcados como Atende devem
  ser conferidos por um sócio na página citada.

### 4.6 Projetos
- Um projeto por entrega, ligado a um cliente: situação, dono, prazo, link do
  repositório, PRD e lista de tarefas.

### 4.7 Contratos
- Modelo de contrato preenchido com os dados do cliente e da proposta.
- Guarda do PDF assinado, vigência e alerta de renovação.

### 4.8 Financeiro e Banco Inter
- Integração com a API do Inter Empresas, somente leitura: saldo, extrato e
  avisos de Pix recebido. Não implemente pagamento nem transferência.
- Antes de programar, leia a documentação oficial atual da API do Inter e
  confirme autenticação, escopos, certificado e endereços. Não confie na memória.
- A conta ainda não está aberta. Construa a integração atrás de uma interface
  (`ProvedorBancario`) com duas implementações: uma de demonstração, com dados
  de exemplo, e a do Inter. A troca é por variável de ambiente.
- Certificado e chaves do banco ficam só no servidor.
- Conciliação: ligar cada entrada do extrato a uma mensalidade ou parcela,
  automaticamente quando valor e pagador baterem, e manualmente no resto.
- Mensalidades recorrentes por cliente e produto, com situação (A vencer,
  Pago, Atrasado).
- Categorias de saída, custos fixos, resultado do mês e divisão em partes
  iguais entre os três sócios.
- Teto do MEI: mostrar o quanto já foi faturado no ano contra o limite, com
  limite proporcional no ano de abertura (valor configurável) e alerta em 80%.
- Exportação mensal em planilha para o contador.

### 4.9 Agenda
- Integração com o Google Agenda: ler a agenda compartilhada da GTM e criar
  eventos a partir de visitas, próximos passos e prazos de editais.
- Visão de semana e de mês, com filtro por sócio.
- Alteração feita no Hub reflete no Google e o contrário também.

### 4.10 Produtos
- Catálogo do que a GTM vende, com preço de implantação, mensalidade e
  clientes ativos de cada um.

### 4.11 Automação
- Caixa de aprovações: ações preparadas por agentes esperam um sócio aprovar,
  editar ou recusar. Fica registrado quem decidiu.
- Painel de agentes: situação, gatilho, última execução, custo de IA no mês
  e teto de gasto de cada um.
- Ponto de entrada (API com chave) para o n8n registrar execuções e criar
  itens na Caixa de aprovações.

## 5. Regras de IA

- Toda chamada à API do Claude passa por um único módulo no servidor.
- Registrar em cada chamada: função, tokens, custo estimado e quem acionou.
- Teto mensal de gasto em variável de ambiente. Ao atingir, as funções de IA
  param e o sistema avisa.
- Respostas em formato estruturado, validadas por esquema. Se a validação
  falhar, tentar uma vez e, se falhar de novo, mostrar erro claro.
- Os prompts ficam em arquivos versionados, um por função.
- A IA nunca envia nada para fora do sistema por conta própria.

## 6. Segurança e LGPD

- Segredos só em variáveis de ambiente. Entregue um `.env.example` sem valores.
- O diagnóstico registra processos do cliente, nunca dados pessoais de
  pacientes ou consumidores do cliente. Deixe esse aviso na tela.
- Áudios de visita, se implementados, exigem marcação de autorização e são
  apagados após 30 dias.
- Rotina diária de backup do banco, com instrução de restauração testada.
- Nenhum dado real em testes. Use dados de exemplo claramente fictícios.

## 7. Como trabalhar

Passo 1. Explore o repositório e `docs/`. Não escreva código. Entregue um
relatório curto do que existe e do que falta.

Passo 2. Faça até 8 perguntas sobre o que estiver ambíguo e espere as respostas.

Passo 3. Escreva `docs/PRD.md` (objetivo, módulos, telas, regras, modelo de
dados completo, critérios de pronto), `docs/ARQUITETURA.md` e `CLAUDE.md`
(stack, pastas, comandos, convenções).

Passo 4. Escreva `docs/PLANO.md` com as fases abaixo, cada uma dividida em
etapas pequenas, com resultado visível e forma de testar.

- Fase 1: base, design e componentes, acesso, equipe e histórico.
- Fase 2: leads e clientes, diagnóstico e análise de leads.
- Fase 3: triagem de editais e radar.
- Fase 4: agenda e projetos.
- Fase 5: financeiro com provedor de demonstração e, depois, o Inter.
- Fase 6: contratos, produtos e início.
- Fase 7: caixa de aprovações, painel de agentes e ponto de entrada do n8n.

Passo 5. Pare e peça aprovação do PRD e do plano.

Passo 6. Execute uma etapa por vez. Em cada uma: implemente, rode testes e
verificação de tipos, confira a tela em celular e computador, faça um commit
com mensagem clara, atualize o `PLANO.md` e mostre o que mudou.

Passo 7. Ao fim de cada fase, pare, faça uma revisão do código da fase com um
subagente que não participou da implementação, corrija o que ele apontar e
espere a aprovação dos sócios para a fase seguinte.

## 8. Limites

- Não instale dependência sem justificar em uma linha.
- Prefira a solução mais simples que cumpre o critério de pronto.
- Não apague dados nem reescreva o histórico do Git sem autorização.
- Não crie contas, não contrate serviços e não publique nada por conta própria.
  Quando precisar de uma credencial, diga qual, para quê e como obter.
- Problemas fora da etapa atual vão para `docs/PENDENCIAS.md`.

Comece agora pelo Passo 1.
