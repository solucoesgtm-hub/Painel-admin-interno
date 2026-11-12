# Pendências

## Credenciais necessárias (nenhuma foi criada)
| Credencial | Para quê | Como obter |
| --- | --- | --- |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Dados reais | Projeto no neon.com → Connect (ver `docs/BANCO-NEON.md`) |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Login dos sócios | `npx auth secret` + cliente OAuth no Google Cloud Console |
| `ANTHROPIC_API_KEY` | Funções de IA (Fase 2+) | console.anthropic.com |
| Bucket S3/R2 | PDFs de editais e contratos | Cloudflare R2 |
| Certificado e chaves do Inter | Extrato (Fase 5) | Após abrir a conta PJ; ler a documentação oficial atual antes |

## Material faltando
- `docs/marca/` com os arquivos da logo — hoje há uma marca provisória em `src/components/layout/logo.tsx`.
- Estudo do sistema e imagens dos protótipos em `docs/` — as telas foram desenhadas a partir da especificação; comparar quando chegarem.

## Decisões em aberto
- Sócios: hoje vêm de `src/lib/demo/dados.ts`; passar a ler da tabela `socios` quando o Neon estiver ligado.
- Campos de proposta (implantação/mensalidade) e pontuação ainda não existem na tabela `leads` — criar migração na Fase 2.
- Histórico: ligar a tela à tabela `historico` do Neon.
