# Pendências

## Credenciais necessárias (nenhuma foi criada)
| Credencial | Para quê | Como obter |
| --- | --- | --- |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Dados reais | Projeto no neon.com → Connect (ver `docs/BANCO-NEON.md`) |
| `AUTH_SECRET` | Login dos sócios | `npx auth secret`; depois `npm run db:senha -- email` para cada sócio |
| `ANTHROPIC_API_KEY` | Funções de IA (Fase 2+) | console.anthropic.com |
| Bucket S3/R2 | PDFs de editais e contratos | Cloudflare R2 |
| Certificado e chaves do Inter | Extrato (Fase 5) | Após abrir a conta PJ; ler a documentação oficial atual antes |

## Material faltando
- `docs/marca/` com os arquivos da logo — hoje há uma marca provisória em `src/components/layout/logo.tsx`.
- Estudo do sistema e imagens dos protótipos em `docs/` — as telas foram desenhadas a partir da especificação; comparar quando chegarem.

## Decisões em aberto
- Fora do bloco comercial (leads, diagnóstico, análise), as telas ainda usam dados de demonstração mesmo com o Neon ligado: financeiro, editais, projetos, contratos, produtos, agenda e automação. No Início, só leads e próximos passos são reais.
- Não há como excluir um lead pela tela (decidir se será exclusão ou arquivamento).
- Limite de tentativas de login por IP (hoje há só um atraso fixo por tentativa errada).
