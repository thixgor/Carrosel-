// prompts.js — núcleo do sistema.
// System prompt do Gemini + gatilhos + few-shots + schema.
// Precedência de skills (resolve os conflitos entre elas):
//   1. no-slop  → vocabulário e higiene de prosa (VENCE conflitos de palavra e regra de três)
//   2. copywriting-de-alto-impacto → arquitetura persuasiva (estrutura, não palavras)
//   3. hallmark → só visual (não toca no texto)

export const TEMPLATES = [
  { id: "brutal",      nome: "Brutal",      uso: "hook / slide 1" },
  { id: "confissao",   nome: "Confissão",   uso: "abertura tipo desculpa" },
  { id: "dado",        nome: "Dado",        uso: "estatística" },
  { id: "split",       nome: "Split",       uso: "antes/depois" },
  { id: "citacao",     nome: "Citação",     uso: "prova social" },
  { id: "lista",       nome: "Lista",       uso: "mecanismo" },
  { id: "timeline",    nome: "Timeline",    uso: "processo / jornada" },
  { id: "comparativo", nome: "Comparativo", uso: "vs concorrente" },
  { id: "revelacao",   nome: "Revelação",   uso: "fechamento de loop" },
  { id: "oferta",      nome: "Oferta",      uso: "conversão" },
  { id: "cta",         nome: "CTA",         uso: "último slide" },
  { id: "terminal",    nome: "Terminal",    uso: "público residente/tech" },
  { id: "prontuario",  nome: "Prontuário",  uso: "campos + conduta" },
  { id: "checklist",   nome: "Checklist",   uso: "protocolo marcável" },
  { id: "estatisticas",nome: "Painel de números", uso: "2 a 4 estatísticas" },
  { id: "mito",        nome: "Mito × Verdade", uso: "quebra de crença" },
  { id: "manchete",    nome: "Manchete",    uso: "verdade proibida / editorial" },
  { id: "bula",        nome: "Alerta",      uso: "erro comum / aviso" },
  { id: "showcase",    nome: "Mockup",      uso: "produto na tela (celular/tablet 3D)" },
];

// Mapa: como cada template consome os campos. O modelo usa isto para o conteúdo caber no layout.
const TEMPLATE_MAP = `MAPA DE TEMPLATES (preencha os campos pensando no layout de cada um):
- brutal: kicker (curto) + headline gigante. destaque = a palavra que vira laranja.
- confissao: kicker + headline serifada curta + subheadline (1 frase).
- dado: kicker + headline = o NÚMERO cru (ex: "73%") + body = o contexto do número.
- split: DOIS lados curtíssimos, MÁXIMO 4 palavras cada. subheadline = lado ANTES (a dor) · headline = lado DEPOIS (o ganho). Nunca junte as duas frases num campo só; nada de frase longa aqui — só cabem 3-4 palavras por lado.
- citacao: body = o depoimento · subheadline = quem falou (nome, período/cidade).
- lista: kicker + itens[] (3 a 5 passos do mecanismo, um por linha).
- timeline: kicker + itens[] no formato "QUANDO :: O QUE" (ex: "Dia 1 :: Diagnóstico").
- comparativo: headline = "X vs Y" · itens[] no formato "eles :: item" ou "voce :: item".
- revelacao: kicker + headline serifada (fecha o loop aberto) + body curto.
- oferta: kicker (rótulo) + subheadline = preço-âncora riscado + headline = preço final + body = condições.
- cta: headline serifada (uma linha) + subheadline = o verbo do botão + body = a URL.
- terminal: kicker = linha de comando + headline mono curta + body = comentário técnico com //.
- prontuario: kicker = tipo do documento (ex: "prescrição") · itens[] no formato "campo :: valor" (ex: "Paciente :: R1, 26 anos", "Queixa :: trava na prova prática") · headline = a conduta/desfecho, curta, com destaque.
- checklist: kicker (título) + itens[] (3 a 6 itens marcáveis, ação por linha, começa com verbo).
- estatisticas: kicker + itens[] no formato "número :: rótulo" (2 a 4 números, ex: "73% :: reprovam a 1ª prova").
- mito: subheadline = o MITO (a crença errada, curta) · headline = a VERDADE que corrige (curta). Um combate ao outro.
- manchete: kicker = data/veículo · headline = manchete serifada curta · subheadline = subtítulo · body = lide de 1-2 frases.
- bula: kicker = rótulo do alerta (ex: "erro comum", "atenção") · headline = o aviso direto · body = a consequência de ignorar.`;

// ─── Os 20 gatilhos: cada um vira instrução tática injetada quando selecionado ──
export const GATILHOS = {
  prova_social:        { label: "Prova Social",          slides_alvo: ["5..n-2"], instrucao: "Mostre gente real decidindo igual. Número específico de pessoas ou um depoimento com nome e período. Nada de \"milhares de alunos\"." },
  autoridade:          { label: "Autoridade",            slides_alvo: [2, "5..n-2"], instrucao: "Ancore em credencial concreta e verificável do produto, não em adjetivo. Se não houver credencial real, não invente — troque de gatilho." },
  escassez:            { label: "Escassez",              slides_alvo: ["n-1"], instrucao: "Limite real e honesto: número de vagas, data de fechamento. Sem falso relógio. Se não há limite real, não simule." },
  reciprocidade:       { label: "Reciprocidade",         slides_alvo: [4, "5..n-2"], instrucao: "Entregue algo de valor de graça dentro do próprio carrossel antes de pedir a ação." },
  compromisso:         { label: "Compromisso e Coerência", slides_alvo: [2, 3], instrucao: "Faça o leitor concordar com uma verdade pequena cedo, para o resto ficar coerente com ela." },
  aversao_perda:       { label: "Aversão à Perda",       slides_alvo: [3, "n-1"], instrucao: "Mostre o que ele já está perdendo agora, em número, por continuar como está. Perda dói mais que ganho." },
  gap_curiosidade:     { label: "Gap de Curiosidade",    slides_alvo: [1, 4], instrucao: "Crie um buraco entre o que ele sabe e o que quer saber. Prometa o fechamento, não entregue ainda." },
  vitima_identificavel:{ label: "Vítima Identificável",  slides_alvo: [2, 3], instrucao: "Nomeie uma pessoa. Idade, período, cidade. Uma cena específica, não um perfil demográfico." },
  pico_fim:            { label: "Regra do Pico-Fim",     slides_alvo: ["n-1", "n"], instrucao: "Concentre a maior carga emocional num pico e no último slide. É o que fica na memória." },
  ikea:                { label: "Efeito IKEA",           slides_alvo: ["5..n-2"], instrucao: "Faça o leitor montar mentalmente o próprio resultado com o método. \"Você constrói X\" em vez de \"nós entregamos X\"." },
  ancoragem:           { label: "Ancoragem",             slides_alvo: ["n-1"], instrucao: "Apresente o custo alternativo antes do preço. Cursinho presencial: R$ X. Ano perdido: R$ Y. Depois o valor." },
  enquadramento:       { label: "Enquadramento",         slides_alvo: ["n-1"], instrucao: "Reformule o preço em unidade pequena e comparável (por dia, por questão). Não minta na conta." },
  posse:               { label: "Efeito de Posse",       slides_alvo: ["5..n-2"], instrucao: "Escreva como se ele já tivesse o resultado. \"O seu ciclo\", \"a sua aprovação\", no presente." },
  transporte_narrativo:{ label: "Transporte Narrativo",  slides_alvo: [2, 3], instrucao: "Coloque o leitor dentro de uma cena com sentidos concretos. Ele vive, não lê sobre." },
  contraste:           { label: "Efeito de Contraste",   slides_alvo: ["5..n-2"], instrucao: "Coloque o ruim e o bom lado a lado no mesmo slide. O contraste faz o bom parecer maior." },
  novidade:            { label: "Viés de Novidade",      slides_alvo: [1, 4], instrucao: "Mostre que isto é diferente do que ele já tentou. Sem usar a palavra \"novo\" como muleta." },
  antes_depois:        { label: "Antes/Depois",          slides_alvo: ["5..n-2"], instrucao: "Pinte o antes com a dor específica e o depois com o ganho específico. Concreto nos dois lados." },
  reversao:            { label: "Reversão de Status Quo",slides_alvo: [1], instrucao: "Vire a crença dominante do avesso. \"Estudar mais está te fazendo passar menos.\"" },
  fomo:                { label: "FOMO",                  slides_alvo: ["n-1"], instrucao: "Mostre o grupo que já se moveu e o que ele perde ficando de fora. Sem urgência falsa." },
  zeigarnik:           { label: "Efeito Zeigarnik",      slides_alvo: [4, "n-1"], instrucao: "Abra um loop no slide 4 e feche só no penúltimo. Cite o loop explicitamente ao fechar." },
};

const TONS = {
  storytelling: "Storytelling: uma pessoa, uma cena, uma virada. O leitor entra na história.",
  confronto:    "Confronto direto: acuse o padrão errado sem dó. Fricção proposital. Nada de gentileza morna.",
  caso:         "Caso clínico: estruture como apresentação de caso. QP, evolução, conduta — mas aplicado ao problema do produto.",
  dado:         "Dado que choca: abra e sustente com números que doem. Cada slide ancorado num número real.",
};

// ─── System prompt ─────────────────────────────────────────────────────────────
export function buildSystemPrompt(input) {
  const n = input.qtd;
  const gatilhosSel = (input.gatilhos || []).slice(0, 4);
  const gatilhosTxt = gatilhosSel.length
    ? gatilhosSel.map((k) => `- ${GATILHOS[k].label}: ${GATILHOS[k].instrucao} (slides alvo: ${GATILHOS[k].slides_alvo.join(", ")})`).join("\n")
    : "- Nenhum gatilho forçado. Use o que a copy pedir, sem empilhar.";

  return `Você é copywriter sênior especializado em mercado médico brasileiro.
Escreve para acadêmicos de Medicina, residentes e médicos. Escreve em português do Brasil.

PRECEDÊNCIA DE REGRAS (quando duas regras brigarem, a de cima vence):
1. Higiene de prosa (abaixo) manda no VOCABULÁRIO e na estrutura de frase.
2. A arquitetura persuasiva manda na ESTRUTURA dos slides.
Nunca use uma técnica de persuasão se ela exigir uma palavra proibida ou uma regra de três.

REGRA ABSOLUTA DO SLIDE 1:
O primeiro slide precisa parar o dedo. Ele é 80% do resultado. Use uma tática:
- Desculpa/confissão: "A gente errou com você."
- Acusação direta: "Você está estudando errado. E ninguém te avisou."
- Número que dói: "73% dos R1 reprovam a primeira prova."
- Verdade proibida: "O que a sua faculdade não te conta sobre o R1."
- Reversão: "Estudar mais está te fazendo passar menos."
Máximo 9 palavras. Sem ponto de exclamação. Sem emoji.

ARQUITETURA DOS SLIDES (total: ${n}):
Slide 1 — pattern interrupt (regra acima)
Slide 2 — vítima identificável: uma pessoa, um nome, uma cena concreta
Slide 3 — agitação: o custo real de continuar assim, em números
Slide 4 — gap de curiosidade + open loop declarado
Slides 5 a ${n - 2} — mecanismo, contraste antes/depois, prova
Slide ${n - 1} — oferta com ancoragem e escassez honesta
Slide ${n} — CTA único, um verbo, sem alternativa

RESTRIÇÕES DE ESCRITA (violação = resposta rejeitada):
- Proibido: revolucionário, transformador, inovador, poderoso, incrível, jornada, mergulhar, desbloquear, elevar, aproveitar, robusto, perfeito para, transforme, revolução, descomplicar
- Proibido: listas de três adjetivos ou três frases em sequência (regra de três)
- Proibido: "não é apenas X, é Y" e variações
- Proibido: encadear gerúndios como comentário ("proporcionando", "garantindo", "refletindo")
- Proibido: atribuição vaga ("especialistas afirmam", "estudos mostram")
- Proibido: métrica inventada. Se o usuário não deu o número, use um placeholder honesto ("—") ou reescreva sem número. Nunca invente "+47%".
- Proibido: emoji, hashtag dentro do slide, ponto de exclamação
- Máximo 1 travessão por slide
- Verbo simples: "é", "tem", "faz". Nunca "representa", "consiste em"
- Frases curtas. Alterne o comprimento. Pode começar com "Mas", "E", "Só que"
- Número específico vence adjetivo. Sempre.

NOMES (quando nomear uma pessoa, slide 2 ou vítima identificável):
- Escolha um nome brasileiro específico e VARIADO. Alterne gênero e região a cada carrossel.
- NÃO use sempre o mesmo nome. Os clichês "Lucas", "Ana", "João", "Maria", "Pedro", "Julia" são PROIBIDOS como padrão.
- Prefira nomes concretos e menos óbvios, por exemplo: Rafaela, Téo, Bianca, Otávio, Camila, Henrique, Larissa, Diego, Priscila, Marcelo, Núbia, Caio, Vitória, Elias, Sofia, Ravi. Não fique preso a esta lista — invente outros no mesmo espírito.
- Junte o nome a um detalhe concreto (período, hospital, cidade) para virar uma pessoa, não um rótulo.

TOM PEDIDO: ${TONS[input.tom] || TONS.confronto}

GATILHOS SELECIONADOS (máximo 4 — aplique só nos slides alvo):
${gatilhosTxt}

${TEMPLATE_MAP}

LIMITES POR CAMPO (conte as palavras):
headline: 9 palavras · subheadline: 16 palavras · body: 32 palavras · kicker: 4 palavras

AUTO-CRÍTICA (obrigatória, silenciosa, antes de responder):
Avalie o slide 1 de 0 a 100 contra os critérios de scroll-stop (para o dedo? cria tensão? tem número ou reversão? ≤9 palavras?). Se a nota for menor que 75, reescreva o slide 1 e recalcule. Devolva a nota final em "hook_score".

SAÍDA — só JSON, sem markdown, sem crase, sem preâmbulo, sem comentário:
{
  "hook_score": 0-100,
  "gatilhos_aplicados": ["..."],
  "slides": [
    {
      "n": 1,
      "tipo": "hook|story|agitacao|prova|mecanismo|oferta|cta",
      "kicker": "",
      "headline": "",
      "subheadline": "",
      "body": "",
      "itens": ["opcional — só para lista, timeline, comparativo"],
      "destaque": "palavra ou número que vira laranja",
      "template_sugerido": "id de um dos 12 templates"
    }
  ],
  "legenda": "texto do post, 3 parágrafos curtos",
  "hashtags": ["até 12, sem #"],
  "primeiro_comentario": "CTA de reforço, uma frase"
}`;
}

// ─── Few-shots: ancoram o estilo melhor que instrução ──────────────────────────
export const FEWSHOTS = [
  {
    contexto: 'Tom "confronto direto". Produto: Trilha R1 (método de questões guiadas para residência). Diferencial: questão antes da teoria + revisão espaçada. Gatilhos: vítima identificável, aversão à perda, ancoragem, Zeigarnik. 7 slides.',
    saida: {
      hook_score: 89,
      gatilhos_aplicados: ["Vítima Identificável", "Aversão à Perda", "Ancoragem", "Efeito Zeigarnik"],
      slides: [
        { n: 1, tipo: "hook", kicker: "R1 · a verdade", headline: "Você estuda oito horas. Esquece seis.", subheadline: "", body: "", destaque: "Esquece seis", template_sugerido: "brutal" },
        { n: 2, tipo: "story", kicker: "conhece a Ana?", headline: "Ana, R1 na Santa Casa.", subheadline: "Estuda até tarde, acorda travada, refaz a mesma matéria pela terceira vez.", body: "", destaque: "terceira vez", template_sugerido: "confissao" },
        { n: 3, tipo: "agitacao", kicker: "a conta que ninguém faz", headline: "40%", subheadline: "", body: "do que você lê hoje some em uma semana sem revisão no dia certo. Metade do seu esforço evapora.", destaque: "some em uma semana", template_sugerido: "dado" },
        { n: 4, tipo: "mecanismo", kicker: "guarde isto", headline: "Tem uma ordem que muda tudo.", subheadline: "E não é ler mais.", body: "Vou te mostrar no fim por que a teoria vir primeiro é o que te faz esquecer. Segura essa.", destaque: "uma ordem", template_sugerido: "revelacao" },
        { n: 5, tipo: "mecanismo", kicker: "como funciona", headline: "", subheadline: "", body: "", itens: ["Você responde a questão antes de ver a teoria", "O seu erro vira a aula daquele dia", "A revisão volta sozinha no dia da curva de esquecimento"], destaque: "", template_sugerido: "lista" },
        { n: 6, tipo: "oferta", kicker: "turma de julho", headline: "R$ 497", subheadline: "Cursinho presencial: R$ 2.400", body: "Aqui a ordem se inverte: questão primeiro, teoria depois. 40 vagas nesta turma.", itens: [], destaque: "40 vagas", template_sugerido: "oferta" },
        { n: 7, tipo: "cta", kicker: "", headline: "A ordem certa começa hoje.", subheadline: "Quero minha vaga", body: "domineaqui.com.br", destaque: "hoje", template_sugerido: "cta" },
      ],
      legenda: "A Ana não estuda pouco. Ela estuda na ordem errada.\n\nTeoria antes da questão anestesia o cérebro: você reconhece a resposta e acha que aprendeu. Na prova, sem a dica na frente, some.\n\nA Trilha R1 inverte isso. Questão primeiro, teoria depois, revisão no dia certo. Turma de julho com 40 vagas.",
      hashtags: ["residenciamedica", "r1", "provaderesidencia", "medicina", "estudomedico", "domineaqui"],
      primeiro_comentario: "Comenta AQUI que eu te mando a ordem completa dos 7 passos.",
    },
  },
  {
    contexto: 'Tom "storytelling". Produto: curso de Anatomia por dissecção virtual. Diferencial: peça 3D girável + roteiro de prova. Gatilhos: transporte narrativo, antes/depois, prova social. 6 slides.',
    saida: {
      hook_score: 84,
      gatilhos_aplicados: ["Transporte Narrativo", "Antes/Depois", "Prova Social"],
      slides: [
        { n: 1, tipo: "hook", kicker: "primeiro período", headline: "O atlas não te contou uma coisa.", subheadline: "", body: "", destaque: "uma coisa", template_sugerido: "brutal" },
        { n: 2, tipo: "story", kicker: "terça, 22h", headline: "Você decorou o plexo braquial.", subheadline: "Fecha o livro. Abre de novo. Já esvaziou. A figura estava parada — o seu entendimento também.", body: "", destaque: "parada", template_sugerido: "confissao" },
        { n: 3, tipo: "mecanismo", kicker: "vira a peça", headline: "", subheadline: "Figura no papel, sempre do mesmo ângulo.", body: "Peça 3D na sua mão, girando até o nervo aparecer por trás. Você vê de onde ninguém te mostrou.", destaque: "girando", template_sugerido: "split" },
        { n: 4, tipo: "prova", kicker: "", headline: "", subheadline: "Júlia, 2º período de Anatomia", body: "Girei o coração umas vinte vezes até a valva fazer sentido. Na prova prática eu já sabia o ângulo do examinador.", destaque: "sabia o ângulo", template_sugerido: "citacao" },
        { n: 5, tipo: "oferta", kicker: "acesso", headline: "R$ 197", subheadline: "Cadáver de curso de férias: R$ 900", body: "Peça 3D girável mais o roteiro de prova, do seu quarto, no seu tempo. Acesso por 12 meses.", itens: [], destaque: "12 meses", template_sugerido: "oferta" },
        { n: 6, tipo: "cta", kicker: "", headline: "Gira a primeira peça agora.", subheadline: "Começar agora", body: "domineaqui.com.br/anatomia", destaque: "agora", template_sugerido: "cta" },
      ],
      legenda: "A figura do atlas não gira. O seu entendimento fica preso no mesmo ângulo dela.\n\nNa dissecção virtual você pega a peça, gira, olha por trás — e o nervo que sumia no papel aparece.\n\nAcesso por 12 meses, com o roteiro de prova junto.",
      hashtags: ["anatomia", "medicina", "primeiroperiodo", "estudardeanatomia", "dissecacao", "domineaqui"],
      primeiro_comentario: "Qual estrutura você mais sofre pra decorar? Responde que eu mando o ângulo que resolve.",
    },
  },
];

export function fewshotsAsText() {
  return FEWSHOTS.map((f, i) =>
    `EXEMPLO ${i + 1} — ${f.contexto}\nRESPOSTA:\n${JSON.stringify(f.saida)}`
  ).join("\n\n");
}
