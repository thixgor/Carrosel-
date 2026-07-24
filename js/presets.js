// presets.js — presets de produto padrão do DomineAqui.
// Cada preset preenche o formulário (mesmos campos de collectInput/fillForm):
// produto, oque, resolve, diferencial, valor, qtd, gatilhos, tom, template.
// gatilhos = chaves válidas de GATILHOS (prompts.js). tom = storytelling|confronto|caso|dado.
// template = "" deixa a IA escolher por slide.

export const DEFAULT_PRESETS = {
  "Manual Clínico": {
    produto: "Manual Clínico — 300+ patologias interativas",
    oque: "Plataforma com mais de 300 patologias abertas: classificação, etiologia, fisiopatologia e farmacologia, com imagens, áudios de ausculta e referências.",
    resolve: "O aluno que precisa abrir 5 livros diferentes pra entender uma doença — e ainda fica com lacuna.",
    diferencial: "Tudo integrado num lugar só e aprofundado de verdade, sem o resumo raso de tópico com pontinho de IA. Sons reais de sopros e ausculta, fotos das lesões (erisipela, hanseníase), atualizado o tempo todo. Só funciona logado, dentro do site.",
    valor: "Acesso completo no Premium",
    qtd: 8,
    gatilhos: ["contraste", "autoridade", "gap_curiosidade", "posse"],
    tom: "confronto",
    template: "",
  },

  "Prescrição Real (SUS)": {
    produto: "Prescrição Real em Saúde — o manual de plantão do SUS",
    oque: "Ebook de 330 páginas com as 50 queixas que mais entram na UBS e na UPA, cada uma com abordagem rápida, red flags, exame físico e a receita real usando o que existe na REMUME.",
    resolve: "O medo de travar no plantão sem saber a dose, a via ou o que fazer quando falta o medicamento ideal na prateleira.",
    diferencial: "Não é tratado teórico, é manual de guerra. Dose, via e posologia da DCB do SUS, plano B pra quando falta o remédio, antídotos que salvam (naloxona, adrenalina IM) e as armadilhas que cegam ou matam (captopril nunca sublingual, corticoide ocular na atenção primária).",
    valor: "R$ 47",
    qtd: 8,
    gatilhos: ["vitima_identificavel", "aversao_perda", "autoridade", "ancoragem"],
    tom: "caso",
    template: "",
  },

  "Cadernos de APG": {
    produto: "Cadernos de APG — objetivos destrinchados",
    oque: "Caderno único com vários APGs completamente abertos: cada objetivo de aprendizagem aprofundado, mais os objetivos interspecíficos que o grupo não alcança.",
    resolve: "Chegar no fechamento do APG com objetivo pela metade e ter que garimpar em vários materiais soltos.",
    diferencial: "Segue a lógica de metodologia ativa e da Taxonomia de Bloom do próprio curso, cobre até o 5º período, organizado e explicado sem lacuna — feito por quem passou pelo mesmo APG.",
    valor: "R$ 147",
    qtd: 8,
    gatilhos: ["reciprocidade", "prova_social", "gap_curiosidade", "antes_depois"],
    tom: "storytelling",
    template: "",
  },

  "Flashcards de Anatomia": {
    produto: "Flashcards de Anatomia — repetição espaçada",
    oque: "Baralhos de anatomia com repetição espaçada e experiência de uso caprichada, cada card feito por pessoas.",
    resolve: "Decorar plexo, forame e trajeto e esquecer tudo em uma semana.",
    diferencial: "Estudo ativo com evidência científica: a revisão volta sozinha no dia da curva de esquecimento. Interativo, usado dentro do site — não um PDF que você fecha e some.",
    valor: "Disponível em /flashcards",
    qtd: 7,
    gatilhos: ["antes_depois", "ikea", "novidade", "prova_social"],
    tom: "dado",
    template: "",
  },

  "Flashcards por IA (Premium)": {
    produto: "Flashcards por IA — na ementa do seu curso",
    oque: "A IA gera flashcards a partir da ementa da sua faculdade — você escolhe exatamente o que vai estudar.",
    resolve: "Perder tempo montando baralho do zero pra cada prova.",
    diferencial: "500 flashcards por dia, colados na ementa real do seu curso, estudo ativo pronto em segundos. Recurso Premium, só dentro do site.",
    valor: "Incluso no Premium",
    qtd: 7,
    gatilhos: ["novidade", "enquadramento", "posse", "fomo"],
    tom: "confronto",
    template: "",
  },

  "Provas IA + antigas": {
    produto: "Provas por IA + provas antigas da faculdade",
    oque: "Provas individuais geradas por IA na ementa do seu curso e o acervo de provas antigas pra treinar.",
    resolve: "Chegar na prova sem ter treinado no formato que a faculdade cobra.",
    diferencial: "400 provas IA por dia na sua ementa, mais provas antigas reais pra simular. Você faz de graça; baixa em PDF sendo Essential ou Premium.",
    valor: "Download no Essential ou Premium",
    qtd: 8,
    gatilhos: ["aversao_perda", "escassez", "enquadramento", "prova_social"],
    tom: "dado",
    template: "",
  },

  "Banco de Questões": {
    produto: "Banco de Questões — uso ilimitado",
    oque: "Banco de questões com uso ilimitado pra treinar todos os dias.",
    resolve: "Estudar teoria passiva e travar na hora de aplicar na questão.",
    diferencial: "Questão antes da teoria vira estudo ativo de verdade. Uso ilimitado no Essential e no Premium.",
    valor: "Incluso no Essential e Premium",
    qtd: 7,
    gatilhos: ["reversao", "antes_depois", "ikea", "aversao_perda"],
    tom: "confronto",
    template: "",
  },

  "Assinatura Premium": {
    produto: "Assinatura Premium — o ecossistema completo",
    oque: "Manual Clínico completo, banco de questões ilimitado, 400 provas IA e 500 flashcards IA por dia, cronogramas ilimitados, download de todas as provas e aulas ao vivo (1º período).",
    resolve: "Juntar material solto de todo canto e ainda pagar caro por cada pedaço.",
    diferencial: "Um acesso que integra manual, questões, provas IA, flashcards IA e cronograma — ferramenta interativa que prende no site, não PDF que você baixa e some.",
    valor: "",
    qtd: 9,
    gatilhos: ["contraste", "ancoragem", "fomo", "posse"],
    tom: "confronto",
    template: "",
  },

  "Assinatura Essential": {
    produto: "Assinatura Essential — o essencial pra render",
    oque: "Banco de questões ilimitado, 400 provas IA e 500 flashcards IA por dia, cronogramas ilimitados e download de todas as provas.",
    resolve: "Querer estudar de forma eficiente sem pagar pelo pacote mais caro.",
    diferencial: "Estudo ativo completo por um preço menor: questões, provas IA e flashcards IA todo dia, sem as aulas ao vivo.",
    valor: "",
    qtd: 8,
    gatilhos: ["enquadramento", "contraste", "antes_depois", "prova_social"],
    tom: "dado",
    template: "",
  },

  "Manual do Eletro": {
    produto: "Manual do Eletro — interativo",
    oque: "Manual interativo de eletrocardiograma pra ler traçado com segurança no plantão.",
    resolve: "A arritmia que passa batido no plantão e vira erro letal.",
    diferencial: "Traçados de verdade pra treinar o olho, dentro do site, do jeito que nenhum PDF entrega. Pouco replicável, feito pra quem tem medo de não dar conta.",
    valor: "",
    qtd: 8,
    gatilhos: ["vitima_identificavel", "aversao_perda", "gap_curiosidade", "zeigarnik"],
    tom: "caso",
    template: "",
  },

  "Cronograma da faculdade": {
    produto: "Cronograma vinculado à faculdade",
    oque: "Cronograma de estudos colado no calendário real do seu curso.",
    resolve: "Estudar no escuro, sem saber o que priorizar antes de cada prova.",
    diferencial: "Sabe o que estudar hoje sem montar planilha nenhuma. Ilimitado no Essential e no Premium.",
    valor: "Ilimitado no Essential e Premium",
    qtd: 7,
    gatilhos: ["posse", "enquadramento", "antes_depois", "reciprocidade"],
    tom: "storytelling",
    template: "",
  },
};
