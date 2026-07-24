# Instalar no iPhone (PWA)

O app já é um PWA: ícone, manifest, service worker (offline) e compartilhamento nativo estão prontos. Falta só colocar no ar num endereço HTTPS, porque o iPhone só instala PWA por HTTPS (o `localhost` funciona só na sua máquina).

Um único deploy resolve tudo: o `server.js` serve o site **e** esconde a chave da API. Ninguém consegue tirar a chave do app, porque ela fica no servidor.

## Deploy no Render (grátis, ~10 min)

1. Suba o projeto para um repositório no GitHub (sem o `.env` — ele está no `.gitignore`).
2. Em https://render.com, crie um **New → Web Service** e conecte o repositório.
3. Configuração:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment → Add Environment Variable:**
     - `GEMINI_API_KEY` = sua chave
     - `GEMINI_MODEL` = `gemini-3.6-flash`
4. Deploy. O Render devolve uma URL `https://seu-app.onrender.com`.

Os ícones já vêm gerados em `assets/icons/`, então o `sharp` não roda no servidor. Só rode `npm run icons` de novo se trocar a logo.

## Instalar no iPhone

1. Abra a URL no **Safari** do iPhone (tem que ser Safari, não Chrome).
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. O ícone verde da DomineAqui aparece na tela. Abrindo por ele, roda em tela cheia, sem barra do Safari.

## Usar

- Preencha, gere e edite igual no desktop — o layout já é mobile.
- Para exportar, use **Exportar → Compartilhar imagens**: abre a folha do iOS para salvar nas Fotos ou mandar direto pro Instagram. (No iPhone essa opção aparece sozinha; o "Baixar ZIP" continua lá como alternativa.)

## Notas

- **Atualizar o app:** a cada mudança, suba o número em `const VERSION` no `sw.js` e faça deploy. O app pega a versão nova sozinho na próxima abertura.
- **Custo:** o plano grátis do Render dorme após inatividade e demora alguns segundos para acordar na primeira chamada. Para uso constante, um plano pago barato resolve.
- **Outros hosts:** Railway, Fly.io e Vercel (como função) funcionam do mesmo jeito — só precisam rodar `npm start` e ter a variável `GEMINI_API_KEY`.
