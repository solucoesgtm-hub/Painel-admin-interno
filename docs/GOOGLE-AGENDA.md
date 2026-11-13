# Ligar o Google Agenda da GTM

O Hub usa uma **conta de serviço** do Google: um "usuário robô" com quem a agenda da GTM é
compartilhada. Não há tela de login nem token para renovar. Com ela ligada:

- a Agenda e a tela Nossa empresa leem os eventos direto do Google (o que muda lá aparece no Hub);
- "Novo evento" no Hub cria o evento no Google;
- excluir no Hub exclui no Google (com confirmação).

Enquanto as variáveis abaixo não existirem, a agenda continua em demonstração.

## 1. Criar o projeto e ativar a API (uma vez)

1. Entre em <https://console.cloud.google.com> com a conta Google da GTM.
2. No topo, **Selecionar projeto → Novo projeto**. Nome sugerido: `gtm-hub`. Criar.
3. Menu **APIs e serviços → Biblioteca**, procure **Google Calendar API** e clique em **Ativar**.

## 2. Criar a conta de serviço e a chave

1. Menu **APIs e serviços → Credenciais → Criar credenciais → Conta de serviço**.
2. Nome: `gtm-hub-agenda`. Concluir (não precisa dar papéis no projeto).
3. Abra a conta criada → aba **Chaves → Adicionar chave → Criar nova chave → JSON**.
   O navegador baixa um arquivo `.json`. **Ele é uma senha**: não envie por chat/e-mail e não
   coloque no repositório.
4. Anote o e-mail da conta (algo como `gtm-hub-agenda@gtm-hub.iam.gserviceaccount.com`).

> Se a organização bloquear a criação de chaves (política `iam.disableServiceAccountKeyCreation`),
> um administrador do Google Workspace precisa liberar para este projeto.

## 3. Compartilhar a agenda da GTM com a conta

1. Abra <https://calendar.google.com> com a conta dona da agenda da GTM.
2. Na agenda desejada: **⋮ → Configurações e compartilhamento**.
3. Em **Compartilhar com pessoas específicas → Adicionar pessoas**, cole o e-mail da conta de
   serviço e escolha **Fazer alterações nos eventos**.
4. Na mesma página, em **Integrar agenda**, copie o **ID da agenda**
   (a agenda principal usa o próprio e-mail; agendas extras terminam em `@group.calendar.google.com`).

## 4. Cadastrar as variáveis

| Variável | Valor |
| --- | --- |
| `GOOGLE_AGENDA_ID` | o ID da agenda do passo 3 |
| `GOOGLE_AGENDA_CREDENCIAIS` | o conteúdo **inteiro** do arquivo `.json` do passo 2, em uma linha |

- **Vercel:** Project → Settings → Environment Variables → adicionar as duas (Production e
  Preview) → fazer um novo deploy.
- **Computador:** colar em `.env.local` (o arquivo não vai para o Git). Para o JSON, use aspas
  simples por fora: `GOOGLE_AGENDA_CREDENCIAIS='{"type":"service_account",...}'`.

Depois de cadastrar, apague o arquivo `.json` baixado.

## 5. Conferir

Abra **Agenda**: o selo "Google Agenda ligado" aparece no topo. Se aparecer
"Não foi possível ler o Google Agenda":

- *agenda não encontrada ou não compartilhada* → confira o ID e o compartilhamento do passo 3;
- *Google recusou a credencial* → o JSON foi colado incompleto ou a chave foi apagada no console.

## Como o Hub marca os eventos

Eventos criados pelo Hub levam, em campos privados do evento, o tipo (visita, próximo passo,
prazo de edital, reunião) e o sócio responsável. Eventos criados direto no Google aparecem como
**Agenda da GTM**, tipo reunião. Recorrências aparecem como ocorrências separadas.
A Agenda lê 2 meses para trás e 6 meses para frente.
