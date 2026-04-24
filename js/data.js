const firebaseConfig = {
  apiKey: "AIzaSyAHzJiTYaSomxAvGbq3G_Nvc2BGNXjcWyw",
  authDomain: "portarianortefrut.firebaseapp.com",
  databaseURL: "https://portarianortefrut-default-rtdb.firebaseio.com/",
  projectId: "portarianortefrut",
  storageBucket: "portarianortefrut.firebasestorage.app",
  messagingSenderId: "350089005789",
  appId: "1:350089005789:web:2c10cad278719b70876934",
  measurementId: "G-PCZZD4L400"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const veiculosCadastrados = [
  { placa: "MPI-4647", nome: "Fiat Strada Prata", img: "fiat-strada-prata.png" },
  { placa: "PPX-2827", nome: "Fiat Strada Branca", img: "fiat-strada-branca.png" },
  { placa: "QRJ-1A02", nome: "Fiat Strada Branca", img: "fiat-strada-branca.png" },
  { placa: "PPY-5A18", nome: "Fiat Mobi (Osvaldinho)", img: "fiat-mobi.png" },
  { placa: "TCA-5G32", nome: "Fiat Mobi (Edgar)", img: "fiat-mobi.png" },
  { placa: "SGD-5G26", nome: "Renault Oroch", img: "oroch.png" },
  { placa: "MSV-3A51", nome: "Caminhonete L200", img: "L200.png" }
];

const veiculosAgendamentoDisponiveis = [
  { placa: "MPI-4647", nome: "Fiat Strada Prata" },
  { placa: "PPX-2827", nome: "Fiat Strada Branca" },
  { placa: "QRJ-1A02", nome: "Fiat Strada Branca" },
  { placa: "PPY-5A18", nome: "Fiat Mobi (Osvaldinho)" },
  { placa: "TCA-5G32", nome: "Fiat Mobi (Edgar)" },
  { placa: "SGD-5G26", nome: "Renault Oroch" },
  { placa: "MSV-3A51", nome: "Caminhonete L200" }
];

let modoAtual = "SAIDA";

const condutoresAutorizados = [
  "ALEX MORORO",
  "AMANDA ATAIDES",
  "ARTHUR SANTOS",
  "BALBINO ALVES",
  "BRAULLER COLARES",
  "BRENO GUEDES",
  "CASSIO HENRIQUE",
  "CRISTIANO",
  "CRISTINA ELISA",
  "DIÊGO SAMPAIO",
  "EDGAR MOREIRA",
  "EDNEY NERES",
  "JUSCIMAR ARCANJO",
  "JOILSON",
  "KLEDER ALVES",
  "LARISSA GOMES",
  "LAYON",
  "LEANDRO LIMA",
  "LITTIBARSKI SILVA",
  "LUAN",
  "LUANA ARAUJO",
  "MARCOS ROBERTO",
  "OSVALDINHO",
  "OSVALDO ATAIDES",
  "PAULO HENRIQUE",
  "ROSIMEIRE GABRESCHT",
  "SAMUEL CARDOSO",
  "SILVIA ZAMPROGNO",
  "VANESSA APARECIDA",
  "LISBOA"
];

const porteirosAutorizados = [
  "EDERVAL",
  "ELIVELTON",
  "FELIPE",
  "JACKSON",
  "RICARDO"
];

const guardasDisponiveis = ["01", "02", "03", "04", "05"];

const empilhadeirasDisponiveis = ["01", "02", "03"];

const jogosDisponiveis = [
  "PING PONG",
  "SINUCA"
];

const produtosVendaMamao = [
  { id: "HAVAI_5", nome: "HAVAI 5KG", descricao: "01 caixa de HAVAI 05Kg", preco: 40 },
  { id: "HAVAI_10", nome: "HAVAI 10KG", descricao: "01 caixa de HAVAI 10Kg", preco: 70 },
  { id: "FORMOSA_10", nome: "FORMOSA 10KG", descricao: "01 caixa de FORMOSA 10Kg", preco: 50 }
];

const opcoesMaturacaoVenda = [
  "ABRINDO FAIXA (2 A 3 DIAS PARA MADURAR)",
  "MADURO PARA CONSUMO",
  "METADE MADURO / METADE ABRINDO FAIXA"
];

const formasPagamentoVenda = [
  "PIX",
  "DINHEIRO"
];

const setoresGuardas = [
  "AGRICOLA",
  "ALMOXARIFADO",
  "COMERCIAL",
  "COMPRAS",
  "CONTROLADORIA",
  "DEPARTAMENTO PESSOAL",
  "ESTOQUE",
  "FATURAMENTO",
  "FINANCEIRO",
  "LAVOURA",
  "LOGISTICA",
  "PCP",
  "POS VENDAS",
  "QUALIDADE",
  "RH",
  "SEGURANCA DO TRABALHO",
  "VISITANTES"
];

const setoresPosto = [
  "LAVOURA",
  "LOGISTICA",
  "PACKING",
  "DUAS BARRAS",
  "SAO RAFAEL",
  "DIRETORIA",
  "OBRAS"
];

const chavesCadastradas = [
  { numero: "1", sala: "BAÚ" },
  { numero: "2", sala: "GALPÃO VILA NOVA" },
  { numero: "3", sala: "CASA COLABORADOR" },
  { numero: "4", sala: "PORTÃO BANHEIROS APOIO" },
  { numero: "5", sala: "SALA DE VÍDEO-APOIO" },
  { numero: "6", sala: "ACESSO AOS BANHEIROS-ADM" },
  { numero: "7", sala: "BANHEIRO MASC/APOIO" },
  { numero: "8", sala: "BANHEIRO FEM/APOIO" },
  { numero: "9", sala: "COZINHA E PORTÃO FUNDO" },
  { numero: "10", sala: "PORTÃO PRINCIPAL" },
  { numero: "11", sala: "PORTARIA" },
  { numero: "12", sala: "BANHEIRO PORTARIA" },
  { numero: "13", sala: "LOGÍSTICA E FATURAMENTO" },
  { numero: "14", sala: "SALA DE VÍDEO" },
  { numero: "15", sala: "DEPÓSITO OFICINA/CALIBRA" },
  { numero: "16", sala: "GRUPO GERADOR" },
  { numero: "17", sala: "ACESSO PRÉDIO ADM" },
  { numero: "18", sala: "RECEPÇÃO" },
  { numero: "19", sala: "CORREDOR 01" },
  { numero: "20", sala: "SALA DE REUNIÃO" },
  { numero: "21", sala: "ARQUIVO MORTO" },
  { numero: "22", sala: "CPD" },
  { numero: "23", sala: "MATRIZ" },
  { numero: "24", sala: "GERENCIAMENTO ADM" },
  { numero: "25", sala: "CORREDOR 02" },
  { numero: "26", sala: "MATERIAL DE ESCRITÓRIO" },
  { numero: "27", sala: "COZINHA" },
  { numero: "28", sala: "COZINHA PRÉDIO ADM" },
  { numero: "29", sala: "COMERCIAL" },
  { numero: "30", sala: "ALMOXARIFADO 01" },
  { numero: "31", sala: "LAVOURA" },
  { numero: "32", sala: "GERÊNCIA FINANCEIRA" },
  { numero: "33", sala: "SECRETARIA EXECUTIVA" },
  { numero: "34", sala: "ARQUIVO PESSOAL SÁVIO" },
  { numero: "35", sala: "SALA DE SÁVIO" },
  { numero: "36", sala: "BANHEIRO FEM ADM" },
  { numero: "37", sala: "BANHEIRO MASC ADM" },
  { numero: "38", sala: "ARQ EM FRENTE A RECEPÇÃO" },
  { numero: "39", sala: "ACESSO PRODUÇÃO" },
  { numero: "40", sala: "REFEITÓRIO" },
  { numero: "41", sala: "DML" },
  { numero: "42", sala: "MATERIAIS QUÍMICOS" },
  { numero: "43", sala: "LABORATÓRIO" },
  { numero: "44", sala: "BANHEIRO FEM PRODUÇÃO" },
  { numero: "45", sala: "BANHEIRO MASC PRODUÇÃO" },
  { numero: "46", sala: "BANHEIRO MASCULINO" },
  { numero: "47", sala: "BANHEIRO FEMININO" },
  { numero: "48", sala: "COMPRAS" },
  { numero: "49", sala: "SEGURANÇA DO TRABALHO" },
  { numero: "50", sala: "RH" },
  { numero: "51", sala: "PRODUÇÃO" },
  { numero: "52", sala: "GERENTE DE OPERAÇÕES" },
  { numero: "53", sala: "TANQUE DE ABASTECIMENTO" },
  { numero: "54", sala: "TANQUE DE ABASTECIMENTO 02" },
  { numero: "55", sala: "CATRACA PRODUÇÃO" },
  { numero: "56", sala: "CATRACA PRINCIPAL" },
  { numero: "57", sala: "CATRACA" },
  { numero: "58", sala: "VESTIÁRIO MASCULINO" },
  { numero: "59", sala: "VESTIÁRIO FEMININO" },
  { numero: "60", sala: "BOMBA E REGISTRO 01" },
  { numero: "61", sala: "BOMBA E REGISTRO 02" },
  { numero: "62", sala: "PORTÃO EMBALAGEM" },
  { numero: "63", sala: "DEPÓSITO DE GÁS" },
  { numero: "64", sala: "PORTÃO SUMIDOURO" },
  { numero: "65", sala: "BANHEIRO FEM CITRUS" },
  { numero: "66", sala: "BANHEIRO MASC CITRUS" },
  { numero: "67", sala: "PORTÃO DO ESTACIONAMENTO" },
  { numero: "68", sala: "PITSTOP 01" },
  { numero: "69", sala: "PITSTOP 02" },
  { numero: "70", sala: "ARMÁRIO ESTOQUE" },
  { numero: "71", sala: "PORTÃO DA ENTRADA DO PÁTIO" },
  { numero: "72", sala: "PORTÃO VESTIÁRIO" },
  { numero: "73", sala: "AGROTISA" },
  { numero: "74", sala: "OZÔNIO" },
  { numero: "75", sala: "EMPILHADEIRA" },
  { numero: "76", sala: "PAINEL DA CALIBRA" },
  { numero: "77", sala: "PALETEIRA ELÉTRICA" },
  { numero: "78", sala: "DML PRODUÇÃO" },
  { numero: "79", sala: "GAVETA DE FERRAMENTAS OFIC" },
  { numero: "80", sala: "CHAVE DA BOMBA" },
  { numero: "81", sala: "PORTÃO FOTOVOLTAICA" },
  { numero: "82", sala: "DEPÓSITO MATERIAL CONST" },
  { numero: "83", sala: "ESTAC ENTRADA LATERAL" },
  { numero: "84", sala: "PAINEL DO GERADOR" },
  { numero: "85", sala: "PORTÃO ENTRADA VILA NOVA" },
  { numero: "86", sala: "S10" },
  { numero: "87", sala: "S500" },
  { numero: "88", sala: "ANDERSON MENGUE" },
  { numero: "89", sala: "ALOJAMENTO NORTEFRUT" },
  { numero: "90", sala: "RACK DA PRODUÇÃO" },
  { numero: "91", sala: "LIMPEZA" },
  { numero: "92", sala: "GAVETA DIÁRIAS" },
  { numero: "93", sala: "SALA DE REUNIÃO NOVA" },
  { numero: "94", sala: "FINANCEIRO" },
  { numero: "95", sala: "GERENTE OPERAÇÕES NOVA" },
  { numero: "96", sala: "BANHEIRO SALA SÁVIO" },
  { numero: "97", sala: "CANCELA DO REFÚGIO" }
];
