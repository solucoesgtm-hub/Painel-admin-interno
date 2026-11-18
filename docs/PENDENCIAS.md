# Pendências

## Credenciais necessárias (nenhuma foi criada)
| Credencial | Para quê | Como obter |
| --- | --- | --- |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Dados reais | Projeto no neon.com → Connect (ver `docs/BANCO-NEON.md`) |
| `AUTH_SECRET` | Login dos sócios | `npx auth secret`; depois `npm run db:senha -- email` para cada sócio |
| `ANTHROPIC_API_KEY` | Relatório e plano com IA na ficha do lead. Sem ela, o sistema já funciona com um exemplo montado a partir do diagnóstico (sem custo); ao cadastrar na Vercel (com `CLAUDE_MODEL` e `IA_TETO_MENSAL_BRL`), o mesmo botão passa a usar a IA | console.anthropic.com |
| Bucket S3/R2 | PDFs de editais e contratos | Cloudflare R2 |
| `INTER_*` (certificado, chave, client id/secret) | Saldo e extrato (código pronto em `src/lib/conexoes/banco.ts`) | Após abrir a conta PJ; ver `docs/CONEXOES.md` |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | Triagem do e-mail e rascunhos | Google Cloud + `npm run gmail:autorizar`; ver `docs/CONEXOES.md` |
| `WHATSAPP_*` / `META_APP_SECRET` | WhatsApp Business | App na Meta + usuário do sistema; ver `docs/CONEXOES.md` |
| `GOOGLE_AGENDA_ID` / `GOOGLE_AGENDA_CREDENCIAIS` | Agenda real da GTM | Conta de serviço no Google Cloud + agenda compartilhada (ver `docs/GOOGLE-AGENDA.md`) |

## Material faltando
- `docs/marca/` com os arquivos da logo — hoje há uma marca provisória em `src/components/layout/logo.tsx`.
- Estudo do sistema e imagens dos protótipos em `docs/` — as telas foram desenhadas a partir da especificação; comparar quando chegarem.

## Próximas telas (a camada de conexão já está pronta)
- Financeiro: guardar o extrato no Neon (hoje é lido do banco com cache de 5 min) e conciliação manual das entradas que não batem sozinhas.
- Guardar no Neon as mensagens recebidas pelo webhook do WhatsApp e enviar pela caixa de aprovações.

## Decisões em aberto
- Fora do bloco comercial (leads, diagnóstico, análise), da empresa e dos contratos, as telas ainda usam dados de demonstração mesmo com o Neon ligado: financeiro (o extrato vem do banco quando o Inter está ligado), editais, produtos e automação. A agenda usa o Google quando a credencial existir. No Início, só leads e próximos passos são reais.
- Não há como excluir um lead pela tela (decidir se será exclusão ou arquivamento).
- Limite de tentativas de login por IP (hoje há só um atraso fixo por tentativa errada).
