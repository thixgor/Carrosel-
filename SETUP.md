# DomineAqui Carousel Engine

Gera carrosséis de Instagram prontos para publicar. O Gemini escreve a copy. Os templates locais montam o visual. O navegador exporta os PNG. Você não paga por imagem, só pelos tokens de texto.

## Como funciona

Três camadas, sem mistura:

- **Copy** — a API do Gemini devolve um JSON com os slides. Só texto.
- **Layout** — 12 templates HTML/CSS locais recebem esse JSON. Custo zero.
- **Export** — `html2canvas-pro` rasteriza cada slide em PNG 1080×1350 no browser. Custo zero.

O servidor Node existe por um motivo só: esconder a sua chave da API. O navegador nunca vê a chave.

## Pré-requisitos

- Node 18 ou mais novo (`node -v` para conferir).
- Uma chave da API do Gemini. É gratuita.

## Chave da API

1. Abra https://aistudio.google.com/apikey e entre com uma conta Google.
2. Clique em "Create API key".
3. Copie a chave.

## Instalação

No terminal, dentro da pasta do projeto:

```bash
cp .env.example .env      # no Windows/PowerShell: copy .env.example .env
```

Abra o `.env` e cole a chave:

```
GEMINI_API_KEY=cole_aqui
GEMINI_MODEL=gemini-3.6-flash
PORT=5173
```

Instale e suba:

```bash
npm install
npm start
```

Abra http://localhost:5173. Se a porta 5173 estiver ocupada, mude `PORT` no `.env`.

## Primeiro carrossel em 4 passos

1. Preencha **Produto** e **Diferencial**. Os dois são obrigatórios. O diferencial é de onde sai a maior parte da persuasão, então seja específico.
2. Escolha o tom, até 4 gatilhos mentais, a quantidade de slides e o **formato**: 4:5 para o feed ou 9:16 para reels (nesse, o conteúdo fica centralizado na vertical). Dá pra trocar o formato depois de gerar — os slides re-encaixam sozinhos.
3. Clique em **Gerar carrossel**. O `hook_score` aparece na barra de cima. Abaixo de 75, o sistema reescreve o slide 1 sozinho antes de te mostrar.
4. Clique em qualquer slide para editar o texto. Quando estiver bom, **Exportar → Baixar ZIP**.

Cada slide tem quatro ações no topo do card: regenerar só ele, baixar o PNG, duplicar, remover. Arraste os cards para reordenar.

## Modelo

O padrão é `gemini-3.6-flash`. Troque em `GEMINI_MODEL` no `.env`:

- `gemini-3.6-flash` — equilíbrio entre custo e qualidade da copy.
- `gemini-3.5-flash-lite` — mais barato e rápido, free tier mais folgado.
- `gemini-3.5-flash` — copy mais afiada, custa mais por token.

O `gemini-2.0-flash` que circulava em tutoriais antigos foi desligado pelo Google em junho de 2026. Não use.

## Limites da API gratuita

O free tier do Gemini tem teto de requisições por minuto e por dia, e ele muda de tempos em tempos. Um carrossel de 8 slides é uma requisição (duas, se o slide 1 precisar de reescrita). Se você bater o limite, a tela mostra o aviso e basta esperar um minuto. Os números atuais estão em https://ai.google.dev/gemini-api/docs/rate-limits.

## Adicionar um template novo

Três arquivos, nesta ordem:

1. **`css/templates.css`** — escreva o bloco `.slide[data-template="seu_id"] { ... }`. Use os tokens de `css/tokens.css` (`var(--color-orange)`, `var(--font-display)`). Não escreva cor ou fonte na mão.
2. **`js/templates.js`** — adicione `seu_id` no objeto `R` com uma função que devolve o HTML dos slots. Se o template for escuro, inclua o id em `DARK` no topo do arquivo (troca a logo para a versão clara).
3. **`js/prompts.js`** — adicione a linha do template em `TEMPLATES` (aparece no dropdown) e uma linha no `TEMPLATE_MAP` explicando ao modelo o que colocar em cada campo.

Recarregue a página. Sem build.

## Editar o system prompt

Todo o texto que vai para o Gemini está em `js/prompts.js`:

- `buildSystemPrompt()` — a regra do slide 1, a arquitetura dos slides, as restrições de escrita, os limites por campo, a auto-crítica e o formato do JSON.
- `GATILHOS` — a instrução tática de cada um dos 20 gatilhos.
- `FEWSHOTS` — os dois exemplos completos. Trocar os few-shots muda o estilo mais do que mudar as instruções.

## Troubleshooting

**"Chave da API recusada ou ausente."**
O `.env` está sem `GEMINI_API_KEY`, ou você editou o `.env` e não reiniciou. Pare o servidor (`Ctrl+C`) e rode `npm start` de novo.

**"Você bateu o limite gratuito da API."**
Teto de requisições do free tier. Espere um minuto. Se acontece direto, troque para `gemini-3.5-flash-lite`.

**"Sem resposta do servidor. O npm start está rodando?"**
O `npm start` caiu ou a porta mudou. Confira o terminal e o `PORT` no `.env`.

**"O modelo não devolveu um JSON válido."**
De vez em quando o modelo escapa do formato. O sistema já tenta duas vezes sozinho. Clique em **Gerar** de novo. Se for teimoso, encurte o diferencial ou baixe a quantidade de slides.

**As fontes somem no PNG exportado.**
Os `.woff2` ficam em `assets/fonts/`. Se você moveu ou apagou a pasta, os slides caem no fallback do sistema. Restaure os arquivos e recarregue.
