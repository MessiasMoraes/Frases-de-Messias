const fs = require('fs');
const path = require('path');

const arquivo = path.resolve(__dirname, '..', 'dados', 'colecoes-editoriais.json');
const existentes = JSON.parse(fs.readFileSync(arquivo, 'utf8'));

const novas = [
  {
    arquivo: 'mensagens-de-gratidao.html',
    slug: 'mensagens-de-gratidao',
    icone: '✨',
    titulo: 'Mensagens de Gratidão para valorizar cada momento',
    tituloCurto: 'Mensagens de Gratidão',
    descricao: 'Mensagens de gratidão bonitas e originais para agradecer pela vida, pelas pessoas especiais e pelas pequenas conquistas de cada dia.',
    resumo: 'Palavras de gratidão para reconhecer o bem que já existe na sua caminhada.',
    introducao: [
      'A gratidão muda a forma como enxergamos o dia. Nesta coleção, você encontra mensagens originais para agradecer pela vida, pelas pessoas que caminham ao seu lado e pelas pequenas conquistas que muitas vezes passam despercebidas.',
      'Escolha uma frase para compartilhar, enviar a alguém especial ou guardar como lembrança. Agradecer não elimina os desafios, mas ajuda o coração a perceber também os motivos que continuam fazendo a vida ter valor.'
    ],
    relacionados: [['✨ Frases de Gratidão', 'frases-de-gratidao.html'], ['🙏 Frases de Fé', 'frases-de-fe.html'], ['📱 Frases para WhatsApp', 'frases-para-whatsapp.html']],
    frases: [
      ['Hoje agradeço pelo que tenho, pelo que aprendo e pelo que ainda estou construindo.', 'Gratidão'],
      ['Há dias comuns que se tornam especiais quando o coração aprende a agradecer.', 'Gratidão'],
      ['A gratidão faz a alma reconhecer que até os pequenos avanços merecem celebração.', 'Gratidão'],
      ['Que eu nunca esqueça de agradecer pelas pessoas que trazem paz para a minha vida.', 'Gratidão'],
      ['A vida fica mais leve quando valorizamos o que já floresce dentro de nós.', 'Gratidão'],
      ['Ser grato é encontrar beleza nas coisas simples que o dia oferece.', 'Gratidão'],
      ['Agradeça pelo caminho percorrido; ele ajudou você a se tornar quem é hoje.', 'Gratidão'],
      ['Mesmo depois de um dia difícil, sempre existe algo pelo qual vale agradecer.', 'Gratidão'],
      ['Que a gratidão seja a memória que o coração escolhe guardar.', 'Gratidão'],
      ['Hoje, agradeça em silêncio por aquilo que a vida fez chegar até você.', 'Gratidão']
    ]
  },
  {
    arquivo: 'frases-de-superacao.html',
    slug: 'frases-de-superacao',
    icone: '🌱',
    titulo: 'Frases de Superação para encontrar força e recomeçar',
    tituloCurto: 'Frases de Superação',
    descricao: 'Frases de superação para vencer momentos difíceis, recuperar a confiança, recomeçar com coragem e seguir em frente todos os dias.',
    resumo: 'Mensagens para lembrar a sua força nos dias em que continuar parece mais difícil.',
    introducao: [
      'Superar não é esquecer o que doeu; é aprender a seguir com mais força, consciência e esperança. Nesta coleção, reunimos frases originais para acompanhar quem está enfrentando mudanças, perdas, desafios ou um novo começo.',
      'Leia no seu tempo, escolha a mensagem que conversa com o seu momento e compartilhe com quem precisa de coragem. Cada passo dado, por menor que pareça, também faz parte da vitória.'
    ],
    relacionados: [['💪 Frases de Motivação', 'frases-de-motivacao.html'], ['🚀 Frases de Sucesso', 'frases-de-sucesso.html'], ['🌅 Frases para Começar o Dia', 'mensagens-para-comecar-o-dia.html']],
    frases: [
      ['Você não precisa ter todas as respostas para dar o próximo passo.', 'Superação'],
      ['A dor pode ensinar, mas não precisa decidir o final da sua história.', 'Superação'],
      ['Recomeçar é uma prova de coragem que ninguém pode tirar de você.', 'Superação'],
      ['Há uma força nova surgindo toda vez que você escolhe não desistir.', 'Superação'],
      ['O caminho difícil também revela a coragem que antes você não conhecia.', 'Superação'],
      ['Não se cobre tanto por ter caído; admire-se por estar levantando outra vez.', 'Superação'],
      ['Você já atravessou dias que pareciam impossíveis e continua aqui.', 'Superação'],
      ['Algumas vitórias acontecem em silêncio, dentro de quem decide continuar.', 'Superação'],
      ['Transforme a dificuldade em aprendizado e o medo em movimento.', 'Superação'],
      ['O seu tempo de florescer pode começar depois de uma fase de tempestade.', 'Superação']
    ]
  },
  {
    arquivo: 'frases-para-mae.html',
    slug: 'frases-para-mae',
    icone: '🌷',
    titulo: 'Frases para Mãe para agradecer com amor e carinho',
    tituloCurto: 'Frases para Mãe',
    descricao: 'Frases para mãe bonitas e originais para agradecer, homenagear e demonstrar amor em aniversários, Dia das Mães e todos os dias.',
    resumo: 'Mensagens de amor para homenagear a presença, a força e o cuidado de uma mãe.',
    introducao: [
      'Mãe é presença, conselho, cuidado e força que muitas vezes se revela nos detalhes. Nesta coleção, você encontra frases originais para agradecer, homenagear e demonstrar carinho pela sua mãe em qualquer ocasião.',
      'Envie uma mensagem hoje, escreva em um cartão ou use uma frase em uma foto especial. Um gesto simples pode dizer com profundidade o quanto esse amor é importante para você.'
    ],
    relacionados: [['🎂 Frases de Aniversário', 'frases-de-aniversario.html'], ['❤️ Frases de Amor', 'frases-de-amor.html'], ['✨ Mensagens de Gratidão', 'mensagens-de-gratidao.html']],
    frases: [
      ['Mãe, o seu amor é um dos lugares mais seguros que meu coração conhece.', 'Mãe'],
      ['Obrigado por transformar cuidado em presença e amor em todos os detalhes.', 'Mãe'],
      ['O abraço de mãe tem a calma que muitos dias difíceis precisam.', 'Mãe'],
      ['Você me ensinou que força também pode ser delicada e cheia de carinho.', 'Mãe'],
      ['Mãe, a sua história vive em cada valor bonito que carrego comigo.', 'Mãe'],
      ['Que a vida devolva a você todo o amor que espalha sem medir esforço.', 'Mãe'],
      ['Não existe distância que diminua a gratidão que sinto por ter você.', 'Mãe'],
      ['Mãe é aquela presença que continua guiando mesmo quando não diz uma palavra.', 'Mãe'],
      ['Hoje é um bom dia para dizer: eu amo você e agradeço por tudo.', 'Mãe'],
      ['O seu cuidado fez da minha caminhada um lugar mais leve e mais seguro.', 'Mãe']
    ]
  },
  {
    arquivo: 'frases-para-pai.html',
    slug: 'frases-para-pai',
    icone: '🧭',
    titulo: 'Frases para Pai para homenagear com carinho e gratidão',
    tituloCurto: 'Frases para Pai',
    descricao: 'Frases para pai bonitas e originais para homenagear, agradecer e demonstrar carinho no Dia dos Pais, aniversário ou em qualquer momento.',
    resumo: 'Mensagens para reconhecer o cuidado, os ensinamentos e a presença de um pai.',
    introducao: [
      'Um pai pode ensinar pelo exemplo, pelo conselho, pelo trabalho diário e pela forma de estar presente. Nesta coleção, reunimos frases originais para homenagear, agradecer e demonstrar carinho por essa figura tão importante.',
      'Use uma mensagem em uma homenagem, em um cartão ou em uma conversa especial. Dizer o que se sente é uma maneira bonita de reconhecer os valores e as lembranças que ajudam a construir uma família.'
    ],
    relacionados: [['🎂 Frases de Aniversário', 'frases-de-aniversario.html'], ['🤝 Mensagens de Amizade', 'mensagens-de-amizade.html'], ['✨ Mensagens de Gratidão', 'mensagens-de-gratidao.html']],
    frases: [
      ['Pai, os seus ensinamentos continuam guiando muitos dos meus passos.', 'Pai'],
      ['Obrigado por mostrar que presença também se constrói nas pequenas atitudes.', 'Pai'],
      ['Um pai deixa marcas de coragem, cuidado e exemplo na história de quem ama.', 'Pai'],
      ['Que a vida retribua a você toda a dedicação que ofereceu à nossa família.', 'Pai'],
      ['Pai, a sua força sempre encontrou um jeito de se transformar em proteção.', 'Pai'],
      ['Levo comigo os conselhos que você deu e o carinho que nunca precisou de muitas palavras.', 'Pai'],
      ['Hoje quero reconhecer o quanto a sua presença fez diferença na minha caminhada.', 'Pai'],
      ['Ser seu filho é carregar comigo uma parte bonita da sua história.', 'Pai'],
      ['Que nunca falte tempo para celebrar as boas lembranças que construímos juntos.', 'Pai'],
      ['Pai, obrigado por acreditar em mim até nos momentos em que eu duvidei de mim mesmo.', 'Pai']
    ]
  },
  {
    arquivo: 'mensagens-de-domingo.html',
    slug: 'mensagens-de-domingo',
    icone: '☀️',
    titulo: 'Mensagens de Domingo para descansar e renovar as energias',
    tituloCurto: 'Mensagens de Domingo',
    descricao: 'Mensagens de domingo com paz, fé, descanso e inspiração para compartilhar, agradecer pela semana e renovar as energias para os próximos dias.',
    resumo: 'Frases para viver o domingo com leveza, gratidão e esperança por uma nova semana.',
    introducao: [
      'O domingo convida a desacelerar, respirar com mais calma e valorizar aquilo que faz bem. Nesta coleção, você encontra mensagens originais para desejar paz, descanso, fé e uma nova semana cheia de boas possibilidades.',
      'Compartilhe com alguém especial ou use uma frase para marcar o seu próprio momento de pausa. Que este dia seja um espaço para cuidar da mente, agradecer pelo vivido e renovar a esperança.'
    ],
    relacionados: [['🌞 Frases de Bom Dia', 'frases-de-bom-dia.html'], ['🌤️ Mensagens de Boa Semana', 'mensagens-de-boa-semana.html'], ['🕊️ Frases de Paz', 'frases-de-paz.html']],
    frases: [
      ['Que o seu domingo tenha a calma que a alma precisa para respirar.', 'Domingo'],
      ['Domingo é um convite para desacelerar e agradecer pelo que a semana ensinou.', 'Domingo'],
      ['Que a paz encontre espaço na sua casa, na sua mente e no seu coração hoje.', 'Domingo'],
      ['Aproveite o domingo para guardar energia e esperança para os novos dias.', 'Domingo'],
      ['Nem todo descanso é parar; às vezes é voltar a sentir a vida com mais calma.', 'Domingo'],
      ['Que este domingo renove a sua fé e aproxime você do que realmente importa.', 'Domingo'],
      ['Hoje, escolha menos pressa, mais presença e um coração agradecido.', 'Domingo'],
      ['Um domingo tranquilo pode ser o começo de uma semana mais leve.', 'Domingo'],
      ['Que a sua tarde seja cheia de paz, boas conversas e pensamentos bonitos.', 'Domingo'],
      ['Desejo que você encerre o domingo com a certeza de que dias melhores podem chegar.', 'Domingo']
    ]
  },
  {
    arquivo: 'mensagens-de-amizade.html',
    slug: 'mensagens-de-amizade',
    icone: '🤝',
    titulo: 'Mensagens de Amizade para celebrar pessoas especiais',
    tituloCurto: 'Mensagens de Amizade',
    descricao: 'Mensagens de amizade bonitas e originais para agradecer, demonstrar carinho e celebrar amigos que tornam a vida mais leve e especial.',
    resumo: 'Frases de carinho para reconhecer a importância de uma amizade verdadeira.',
    introducao: [
      'Amizades verdadeiras transformam a rotina em companhia, os dias difíceis em apoio e as conquistas em celebração. Nesta coleção, você encontra mensagens originais para lembrar a alguém o quanto sua presença é importante.',
      'Envie uma frase sem esperar uma data especial. Um gesto de carinho pode aproximar, fortalecer vínculos e fazer um amigo perceber que é lembrado com gratidão.'
    ],
    relacionados: [['🤝 Frases de Amizade', 'frases-de-amizade.html'], ['📱 Frases para WhatsApp', 'frases-para-whatsapp.html'], ['🎂 Frases de Aniversário', 'frases-de-aniversario.html']],
    frases: [
      ['Amizade verdadeira é aquela que faz o caminho parecer menos pesado.', 'Amizade'],
      ['Ter você por perto é saber que os dias bons ficam melhores e os difíceis ficam mais leves.', 'Amizade'],
      ['Amigo de verdade não precisa estar presente em todos os momentos para ser importante em todos eles.', 'Amizade'],
      ['Algumas pessoas chegam e fazem a vida ganhar mais risadas, confiança e cor.', 'Amizade'],
      ['Obrigado por ser abrigo nas conversas e alegria nas lembranças.', 'Amizade'],
      ['Uma amizade sincera é um presente que o tempo confirma todos os dias.', 'Amizade'],
      ['Que nunca faltem amigos que celebrem suas vitórias com o coração inteiro.', 'Amizade'],
      ['A amizade é a forma mais bonita de dizer: você não está sozinho.', 'Amizade'],
      ['Pessoas especiais não precisam de grandes gestos para deixar marcas profundas.', 'Amizade'],
      ['Hoje lembrei de você e agradeci pela sorte de ter a sua amizade.', 'Amizade']
    ]
  },
  {
    arquivo: 'frases-de-casal.html',
    slug: 'frases-de-casal',
    icone: '💞',
    titulo: 'Frases de Casal para celebrar o amor e a parceria',
    tituloCurto: 'Frases de Casal',
    descricao: 'Frases de casal bonitas e originais para celebrar parceria, carinho, cumplicidade e momentos especiais ao lado de quem você ama.',
    resumo: 'Mensagens para valorizar o amor que se constrói com respeito, cuidado e companhia.',
    introducao: [
      'Um relacionamento se constrói nas conversas, no respeito, no cuidado e na decisão diária de caminhar juntos. Nesta coleção, reunimos frases originais para celebrar a parceria e os sentimentos que tornam o amor mais bonito.',
      'Use estas mensagens em uma foto, em uma homenagem ou em uma conversa especial. Palavras sinceras ajudam a valorizar os pequenos gestos que sustentam uma relação de carinho e confiança.'
    ],
    relacionados: [['❤️ Frases de Amor', 'frases-de-amor.html'], ['🌧️ Frases de Saudade', 'frases-de-saudade.html'], ['📱 Frases para WhatsApp', 'frases-para-whatsapp.html']],
    frases: [
      ['Amar é encontrar em alguém um lugar onde a vida pode ser mais leve.', 'Casal'],
      ['A parceria mais bonita é aquela que transforma os dois em apoio um para o outro.', 'Casal'],
      ['Que o nosso amor continue escolhendo o diálogo, o respeito e a presença.', 'Casal'],
      ['Estar ao seu lado faz os dias comuns ganharem um significado especial.', 'Casal'],
      ['Amor de verdade não é perfeição; é cuidado mesmo nos dias imperfeitos.', 'Casal'],
      ['A nossa melhor fotografia é aquela em que os dois se sentem em paz.', 'Casal'],
      ['Que nunca nos falte coragem para cuidar daquilo que construímos juntos.', 'Casal'],
      ['Você é a companhia que torna o meu caminho mais bonito.', 'Casal'],
      ['O amor cresce quando a admiração também encontra espaço todos os dias.', 'Casal'],
      ['Entre tantos encontros da vida, agradeço por ter encontrado você.', 'Casal']
    ]
  },
  {
    arquivo: 'frases-de-trabalho.html',
    slug: 'frases-de-trabalho',
    icone: '💼',
    titulo: 'Frases de Trabalho para motivar, agradecer e inspirar',
    tituloCurto: 'Frases de Trabalho',
    descricao: 'Frases de trabalho para motivar a rotina, valorizar o esforço, inspirar equipes e compartilhar mensagens de foco, dedicação e crescimento.',
    resumo: 'Mensagens para levar foco, propósito e incentivo à rotina profissional.',
    introducao: [
      'O trabalho ganha mais sentido quando é acompanhado de propósito, aprendizado e respeito pelo próprio ritmo. Nesta coleção, você encontra frases originais para começar a rotina com foco, reconhecer esforços e inspirar colegas.',
      'Compartilhe uma mensagem com sua equipe, use como reflexão pessoal ou envie a alguém que está começando um novo desafio. Pequenas palavras de incentivo podem mudar a energia de um dia inteiro.'
    ],
    relacionados: [['💪 Frases de Motivação', 'frases-de-motivacao.html'], ['🚀 Frases de Sucesso', 'frases-de-sucesso.html'], ['🌱 Frases de Superação', 'frases-de-superacao.html']],
    frases: [
      ['Trabalhe com propósito, mas não esqueça de reconhecer cada avanço do caminho.', 'Trabalho'],
      ['Grandes resultados costumam nascer da dedicação que ninguém vê.', 'Trabalho'],
      ['A rotina fica mais leve quando o foco encontra espaço para aprender todos os dias.', 'Trabalho'],
      ['Que você tenha coragem para começar e constância para continuar.', 'Trabalho'],
      ['O seu esforço de hoje também está preparando oportunidades para amanhã.', 'Trabalho'],
      ['Fazer bem o que está ao seu alcance é uma forma de construir confiança.', 'Trabalho'],
      ['Nem todo progresso é rápido, mas todo passo consciente ajuda a levar você mais longe.', 'Trabalho'],
      ['Valorize o seu processo; crescer também é aprender enquanto faz.', 'Trabalho'],
      ['Que a sua dedicação encontre caminhos para se transformar em conquista.', 'Trabalho'],
      ['Trabalhar com respeito, foco e gentileza também é uma maneira de inspirar pessoas.', 'Trabalho']
    ]
  },
  {
    arquivo: 'frases-de-paz.html',
    slug: 'frases-de-paz',
    icone: '🕊️',
    titulo: 'Frases de Paz para acalmar a mente e o coração',
    tituloCurto: 'Frases de Paz',
    descricao: 'Frases de paz para acalmar a mente, fortalecer a serenidade, inspirar leveza e compartilhar mensagens de tranquilidade e esperança.',
    resumo: 'Mensagens para desacelerar, respirar e encontrar serenidade no meio da rotina.',
    introducao: [
      'Paz não é a ausência de desafios; é a escolha de não deixar que eles tomem conta de tudo dentro de nós. Nesta coleção, reunimos frases originais para acalmar a mente, trazer leveza e lembrar que você pode cuidar do seu próprio tempo.',
      'Leia devagar, salve a frase que mais tocar seu coração e compartilhe com quem precisa de um respiro. Às vezes, uma mensagem simples pode ser o começo de uma noite mais tranquila ou de um dia mais sereno.'
    ],
    relacionados: [['🙏 Frases de Fé', 'frases-de-fe.html'], ['💡 Frases de Reflexão', 'frases-de-reflexao.html'], ['🌙 Frases de Boa Noite', 'frases-de-boa-noite.html']],
    frases: [
      ['Que a sua mente encontre calma e o seu coração encontre um lugar para descansar.', 'Paz'],
      ['Nem tudo precisa ser resolvido hoje; algumas coisas pedem silêncio e tempo.', 'Paz'],
      ['A paz começa quando você para de carregar o que não é seu.', 'Paz'],
      ['Respire fundo: você não precisa vencer todos os pensamentos de uma vez.', 'Paz'],
      ['Que a serenidade seja mais forte do que a pressa que tenta ocupar o seu dia.', 'Paz'],
      ['A sua paz merece ser uma prioridade, não apenas um desejo distante.', 'Paz'],
      ['Há dias em que cuidar de si é simplesmente escolher desacelerar.', 'Paz'],
      ['Leve no coração aquilo que faz bem e deixe ir o que rouba sua leveza.', 'Paz'],
      ['Que a tranquilidade visite a sua casa e permaneça dentro de você.', 'Paz'],
      ['Paz também é aceitar que alguns caminhos se revelam no tempo certo.', 'Paz']
    ]
  },
  {
    arquivo: 'mensagens-para-comecar-o-dia.html',
    slug: 'mensagens-para-comecar-o-dia',
    icone: '🌅',
    titulo: 'Mensagens para Começar o Dia com fé e motivação',
    tituloCurto: 'Frases para Começar o Dia',
    descricao: 'Mensagens para começar o dia com fé, motivação, esperança e energia positiva para compartilhar no WhatsApp, status ou redes sociais.',
    resumo: 'Frases para abrir a manhã com esperança, coragem e vontade de fazer um dia melhor.',
    introducao: [
      'Todo dia oferece uma nova oportunidade de cuidar dos pensamentos, renovar a esperança e escolher uma direção. Nesta coleção, você encontra mensagens originais para começar a manhã com fé, foco, gratidão e motivação.',
      'Escolha uma frase para o seu status, envie a alguém especial ou leia como lembrete antes de iniciar a rotina. Um bom começo não precisa ser perfeito: ele só precisa ter intenção e coragem.'
    ],
    relacionados: [['🌞 Frases de Bom Dia', 'frases-de-bom-dia.html'], ['💪 Frases de Motivação', 'frases-de-motivacao.html'], ['🙏 Frases de Deus', 'frases-de-deus.html']],
    frases: [
      ['Comece o dia lembrando que você não precisa ser perfeito para fazer algo bonito.', 'Novo Dia'],
      ['Que a manhã traga clareza para os seus planos e leveza para o seu coração.', 'Novo Dia'],
      ['Hoje é uma nova página: escreva nela com coragem, fé e gentileza.', 'Novo Dia'],
      ['Antes de correr para as tarefas, agradeça pela chance de recomeçar.', 'Novo Dia'],
      ['Que você encontre motivação nas pequenas razões que fazem a vida seguir.', 'Novo Dia'],
      ['Um bom dia começa quando você acredita que algo bom ainda pode acontecer.', 'Novo Dia'],
      ['Leve para hoje a coragem de tentar e a paciência de respeitar o seu tempo.', 'Novo Dia'],
      ['Que os seus primeiros pensamentos sejam de esperança e não de pressa.', 'Novo Dia'],
      ['Hoje, faça o melhor que puder e celebre cada passo dado com verdade.', 'Novo Dia'],
      ['Comece devagar, mas comece: o seu futuro também é construído nesta manhã.', 'Novo Dia']
    ]
  }
];

const nomes = new Set(existentes.map((item) => item.arquivo));
const duplicados = novas.filter((item) => nomes.has(item.arquivo));
if (duplicados.length) {
  throw new Error(`Coleções já existentes: ${duplicados.map((item) => item.arquivo).join(', ')}`);
}

fs.writeFileSync(arquivo, `${JSON.stringify([...existentes, ...novas], null, 2)}\n`);
console.log(`Adicionadas ${novas.length} coleções temáticas. Total atual: ${existentes.length + novas.length}.`);
