# Conexões externas

Todas seguem o mesmo padrão:

- Cada conexão tem uma **versão de demonstração**, que funciona sem chave nenhuma, e a **versão real**.
- A versão real só entra quando **todas** as variáveis dela existem. Configuração pela metade não quebra o painel: a tela fica em demonstração.
- A tela **/conexoes** (menu Empresa → Conexões) mostra a situação de cada uma e o nome das variáveis que faltam, além de um botão **Testar**. O teste não grava nem envia nada.
- As chaves ficam só no servidor: no `.env.local` para testar no computador, e na Vercel (Settings → Environment Variables) para produção. Depois de cadastrar na Vercel, faça um novo deploy.

Código: `src/lib/conexoes/` (Gmail, Inter, WhatsApp) e `src/lib/ia/` (Claude).

---

## 1. IA (Claude): análise do diagnóstico e triagem do e-mail

| Variável | O que é |
| --- | --- |
| `ANTHROPIC_API_KEY` | Chave criada em console.anthropic.com → API Keys |
| `CLAUDE_MODEL` | Modelo da análise do diagnóstico (relatório e plano). Ex.: `claude-sonnet-5-5` |
| `CLAUDE_MODELO_RAPIDO` | Modelo barato para a triagem de e-mail. Padrão: `claude-haiku-5-5` |
| `IA_TETO_MENSAL_BRL` | Teto de gasto por mês. Padrão: 50. Vale para tudo que usa IA |

1. Crie a conta em console.anthropic.com, cadastre um cartão e crie uma chave.
2. Recomendado: defina um limite de gasto também no próprio console da Anthropic.
3. Cadastre as variáveis e aperte **Testar**. O teste só confere a chave e os modelos, sem gerar texto e sem custo.

Sem a chave, a análise usa um exemplo montado pelo diagnóstico e a triagem usa regras simples. Nos dois casos não há custo.

Com a chave, a triagem (`triarEmails` em `src/lib/ia/triagem-email.ts`):
- registra o custo no histórico como `uso_ia`, e esse custo entra no teto do mês;
- passa a usar as regras simples quando o teto é atingido.

## 2. Gmail: caixa de entrada, triagem e rascunhos

O Hub **lê** e cria **rascunhos**. Nada é enviado sem um sócio abrir o Gmail e apertar Enviar.

| Variável | O que é |
| --- | --- |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | Cliente OAuth do Google Cloud |
| `GMAIL_REFRESH_TOKEN` | Gerado uma vez pelo script `npm run gmail:autorizar` |

1. Em console.cloud.google.com, use o mesmo projeto do Google Agenda (ou crie um).
2. **APIs e serviços → Biblioteca**: ative a **Gmail API**.
3. **Tela de consentimento OAuth**:
   - Com **Google Workspace**, escolha o tipo **Interno**. Assim a autorização não expira.
   - Com **Gmail comum**, escolha **Externo** e adicione o e-mail da GTM como usuário de teste.
   - Atenção: com o app em "Teste", o Google derruba a autorização a cada 7 dias. Para não expirar, é preciso publicar o app, e o Google pede verificação para o escopo do Gmail. Com Workspace e tipo Interno esse problema não existe.
4. **Credenciais → Criar credenciais → ID do cliente OAuth → App para computador**. Copie o ID e a chave secreta para o `.env.local`.
5. Rode `npm.cmd run gmail:autorizar`, abra o link, entre com a conta da GTM e autorize. Copie o `GMAIL_REFRESH_TOKEN` que aparece no terminal para o `.env.local` e para a Vercel.
6. Aperte **Testar** em /conexoes. Ele deve mostrar o endereço da caixa conectada.

Escopo usado: `gmail.modify` (ler, marcar e criar rascunhos; não apaga definitivamente).

Próximo passo de tela: uma página "E-mail" que lista a entrada já triada (`provedorEmail().listarEntrada()` + `triarEmails()`), com o botão "Criar rascunho" (`criarRascunho()`).

## 3. Banco Inter: saldo e extrato (somente leitura)

| Variável | O que é |
| --- | --- |
| `PROVEDOR_BANCARIO` | `inter` para ligar; `demo` (padrão) para a demonstração |
| `INTER_CLIENT_ID` / `INTER_CLIENT_SECRET` | Da aplicação criada no Internet Banking |
| `INTER_CERTIFICADO` / `INTER_CHAVE` | Arquivos `.crt` e `.key` da aplicação |
| `INTER_AMBIENTE` | `producao` (padrão) ou `sandbox` |
| `INTER_CONTA` | Opcional: número da conta, se houver mais de uma |

1. Com a conta PJ aberta, no Internet Banking do Inter Empresas, vá em **Soluções para sua empresa → Nova integração** (o nome do menu pode mudar).
2. Marque **somente** a permissão de leitura de extrato e saldo (escopo `extrato.read`). **Não** marque pagamentos nem Pix de saída.
3. Baixe o certificado e a chave e anote o client id e o client secret.
4. Para cadastrar o certificado em variável de ambiente, use o conteúdo do arquivo PEM ou o arquivo em base64. No PowerShell:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.crt"))`
   Faça o mesmo para o `.key`.
5. Defina `PROVEDOR_BANCARIO=inter`. Se quiser começar pelo ambiente de testes do Inter, use `INTER_AMBIENTE=sandbox`.
6. Aperte **Testar**. Ele lê o saldo.

Cuidados:
- Antes de ligar, confira os endereços e escopos na documentação oficial (developers.inter.co). Os valores usados estão em `src/lib/conexoes/banco.ts`.
- O certificado **vence**: anote a data e renove antes.
- O Inter limita as consultas por minuto. Para a conciliação, o certo é guardar o extrato no Neon e atualizar de tempos em tempos.

## 4. WhatsApp Business (Meta)

| Variável | O que é |
| --- | --- |
| `WHATSAPP_TOKEN` | Token permanente de um usuário do sistema |
| `WHATSAPP_NUMERO_ID` | "Phone number ID" do número (não é o telefone) |
| `META_APP_SECRET` | Chave secreta do app, que confere a assinatura do webhook |
| `WHATSAPP_VERIFY_TOKEN` | Texto livre, o mesmo informado ao cadastrar o webhook |
| `META_GRAPH_VERSAO` | Opcional (padrão `v23.0`) |

1. Em business.facebook.com, use o portfólio da GTM, com a empresa verificada se possível.
2. Em developers.facebook.com: **Criar app → Empresa** e adicione o produto **WhatsApp**.
3. Cadastre o número da GTM. Ele não pode estar em uso no app WhatsApp comum ao mesmo tempo. Copie o **Phone number ID**.
4. No Gerenciador de Negócios, em **Usuários do sistema**:
   - crie um usuário administrador;
   - dê a ele acesso ao app e à conta do WhatsApp;
   - gere um token com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`, sem expiração.
5. No app, em **Configurações → Básico**, copie a **Chave secreta do app**.
6. Em **WhatsApp → Configuração → Webhook**:
   - URL de retorno: `https://painel-admin-interno.vercel.app/api/whatsapp/webhook`;
   - token de verificação: o valor de `WHATSAPP_VERIFY_TOKEN`;
   - assine o campo `messages`.
7. Aperte **Testar**. Ele deve mostrar o número e o nome verificado.

Regras da Meta:
- Fora da janela de 24 h desde a última mensagem do cliente, só é possível enviar **modelos aprovados**, com `enviarModelo`.
- No Hub, nenhum envio sai sozinho: o envio deve passar pela caixa de aprovações.

O webhook já confere a assinatura e responde. Guardar as mensagens recebidas no Neon é o próximo passo e precisa de uma tabela nova.

## 5. Já existentes

- **Neon e login:** `docs/BANCO-NEON.md`.
- **Google Agenda:** `docs/GOOGLE-AGENDA.md`.
- **Notificações (VAPID):** `npx web-push generate-vapid-keys`.
