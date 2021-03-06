import axios from "axios";
import { fetchDemandantes, fetchMunicipios } from "controller/api";
import nc from "next-connect";
import { allowCors } from "services/apiAllowCors";
import { maskCapitalize, maskCPF, maskDate } from "utils/masks";
import { phoneNumberFixer } from "utils/phoneNumberFixer";
import { readFile, utils } from "xlsx";

// Handler do NextConnect. Chama o handler dessa conexão.
const handler = nc({
  onError: (err, req, res, next) => {
    res.status(500).end("Something broke!");
  },
  onNoMatch: (req, res) => {
    res.status(404).end("Page is not found");
  },
});

export default allowCors(handler);

/**
 * Converte um objeto do tipo String de valor UPPERCASE,
 * lowercase ou DiVerSo em um objeto String em camelCase.
 * @param {String} str objeto a ser convertido
 * @returns string em formato camelCase
 */
function camelCase(str) {
  return str
    .replace(/\s(.)/g, function (a) {
      return a.toUpperCase();
    })
    .replace(/\s/g, "")
    .replace(/^(.)/, function (b) {
      return b.toLowerCase();
    });
}

/**
 * Normaliza e formata um objeto dentro de uma sheet, seja coluna ou linha.
 * @param {Object} object "key" a ter seu valor normalizado e formatado
 * @returns objeto formatado
 */
const replaceKeys = (object) => {
  Object.keys(object).forEach(function (key) {
    const newKey = camelCase(
      key
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\//g, "_")
        .replace(/º/g, "_")
    );
    if (object[key] && typeof object[key] === "object") {
      replaceKeys(object[key]);
    }
    if (key !== newKey) {
      object[newKey] = object[key];
      delete object[key];
    }
  });
  return object;
};


//Lista de colunas e valores oriundos da planilha os quais devem ser tratados.
const SHEETS_COLUMNS = [
  //"ano",
  //"territorio",
  "demandante",
  //"modalidade",
  //"tipoDeVinculo",
  "municipioDaVaga",
  "municipioDoAluno",
  "nomeDoColegio",
  //"eixoDeFormacao",
  "cursoDeFormacao",
  "dataDeNascimento",
  "raca_cor",
  //"deficiencia",
  "cpfAluno",
  "sexo",
  "matricula",
  "nome",
  "telefone01",
  "telefone02",
  "dataDaConvocacao",
];

/**
 * Manipulação do handler para receber os dados da planilha (de formato File para formato Object)
 * e preparar adequadamente seus valores para então retornar ao backend após uma série de validações.
 */
handler.get(async (req, res) => {
  try {
    const { filename, entity } = req.query;
    // LOCALIZAÇÃO DO ARQUIVO TEMPORÁRIO QUE DEVE TER SEUS DADOS LIDOS E MANIPULADOS
    const filepth = `${process.env.NEXT_PUBLIC_UPLOAD_TEMP_DIR}/${filename}`;
    const workbook = readFile(filepth, {
      type: "array",
      cellDates: true,
    });
    // INSTANCIA O OBJETO CONTENDO OS DADOS
    const sheet = {};
    // RECEBE E MARCA OS DADOS DA PLANILHA
    workbook.SheetNames.forEach((sheetName) => {
      const rawRows = utils.sheet_to_json(workbook.Sheets[sheetName], {
        raw: true,
        defval: null,
      });
      // FORMATA OS DADOS QUE SÃO AS COLUNAS DA PLANILHA
      rawRows.map((row) => replaceKeys(row));
      const filterColumns = rawRows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key]) => SHEETS_COLUMNS.includes(key))
        )
      );
      /**
       * AJUSTA OS NÚMEROS DE TELEFONE E REPARA OS FORMATOS, PARA QUE FIQUE ALINHADO
       * CORRETAMENTE COM O VALOR QUE ENTRARÁ NO BD
       *
       * */
      const rows = filterColumns
        .filter((row) => Object.keys(row).length === SHEETS_COLUMNS.length)
        .map((row) => ({
          ...row,
          telefone01: phoneNumberFixer(row.telefone01, "BR"),
          telefone02: phoneNumberFixer(row.telefone02, "BR"),
        }));
      // SE A LINHA NÃO É NULA, A INCLUI DENTRO DO OBJETO DA PLANILHA
      if (rows.length > 0) {
        sheet[sheetName] = rows;
      }
    });
    // RETORNA MENSAGEM DE ERRO CASO AS COLUNAS ESTEJAM INVÁLIDAS
    if (Object.keys(sheet).length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "invalid file columns" });
    }

    // PRIMEIRA VALIDAÇÃO - VERIFICA NO BANCO BENEFICIÁRIOS JÁ LISTADOS, MARCA BENEFICIÁRIOS ENCONTRADOS, ATIVOS E INATIVOS
    const output1 = await benefLookupTeste(entity, sheet);

    // SEGUNDA VALIDAÇÃO - CONFERE CAMPOS SE COMUNICANDO COM API E BD E OS FORMATA
    const output2 = await benefValidateTeste(entity, output1);

    // RETORNO
    return res.status(200).json({ ok: true, output2 });
  } catch (error) {
    // MANIPULAÇÃO DE EXCEÇÃO (NÃO TRATADA)
    return res.status(500).json({
      status: "error",
      message: "FALHA NA EXECUÇÃO.",
      error: error.message,
    });
  }
});

// MANIPULAÇÃO DE EXCEÇÃO (NÃO TRATADA)
handler.patch(async (req, res) => {
  throw new Error("Throws me around! Error can be caught and handled.");
});

//FORÇA O PARSING CORRETO PARA O CORPO DO CONTEÚDO DO UPLOAD
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Localiza beneficiários por matrícula e por CPF. Caso encontre uma matrícula que coincida com alguma informada
 * dentro do BD, verifica se o nome é o mesmo, a fim de prevenir erros de digitação na planilha de importação.
 * Se a matrícula e o nome forem os mesmos, marca como "item.found".
 * Se não forem os mesmos, marcam com * os campos de nome, matrícula e CPF para que o colaborador valide e
 * verifique se existe alguma informação que foi colocada equivocadamente.
 * Se o status da vaga daquele beneficiário não é "ativo", marca como "item.update".
 * Se o beneficiário da lista na planilha não for encontrado nem pela sua matrícula e nem pelo seu CPF, é marcado
 * como FALSE em "item.found", e marcado como FALSE em "item.update".
 * Valores de CPF nulos são marcados como uma String com 0 de comprimento ("").
 * Valores de Matrícula de Secretaria nulos são mantidos como estão (não são manipulados e nem verificados).
 * @param {Object} entity a entidade do Projeto (Bahia, Tocantins etc). A entidade é provida pela query
 * string da URL da API, em [entity]
 * @param {Object} sheet a planilha pré-formatada, com suas colunas e linhas
 * @returns a planilha já sinalizada com os beneficiários encontrados ativos (que não são cadastrados),
 * não-ativos (que são cadastrados) e beneficiários não encontrados (que devem alimentar o BD). "item.found"
 * indica se foi encontrado no BD, seja por matrícula ou por CPF; "item.update" indica se deve ser atualizado,
 * ou seja, se os dados recebidos na planilha irão sobrescrever a base de dados (exceto nome e matrícula).
 */
async function benefLookupTeste(entity, sheet) {
  const sheets = Object.values(sheet["Plan1"]);
  const matriculas = [];
  const cpfs = [];
  sheets.forEach((item) => {
    if (item.matricula) {
      matriculas.push(item.matricula.toString());
    }
    if (item.cpfAluno) {
      cpfs.push(maskCPF(item.cpfAluno));
    }
  });
  const urlAPIQuery = `${
    process.env.NEXT_PUBLIC_API_PPE_BD_LEGADO
  }/${entity}/beneficiarios?condition=OR&matriculaSAEB=["${matriculas.join(
    '","'
  )}"]&cpf=["${cpfs.join('","')}"]`;
  const respQuery = await axios.get(urlAPIQuery);

  return await Promise.all(
    sheets.map(async (item) => {
      respQuery.data.query.forEach((resp) => {
        //PROCURA BENEFICIÁRIO PELA MATRÍCULA DA SECRETARIA
        if (item.matricula) {
          if (entity === "ba") {
            // VERIFICA SE A MATRÍCULA JÁ EXISTE NO BD
            if (resp.matriculaSAEB.localeCompare(item.matricula) === 0) {
              /**
               * VERIFICA SE O NOME DO BENEFICIÁRIO É IGUAL AO QUE CONSTA NO BD.
               * EM CASOS ONDE HOUVE UMA MUDANÇA DE NOME (EX. CASAMENTOS E DIVÓRCIOS),
               * O COLABORADOR DEVE ALTERAR O NOME, INSERINDO O NOME CONSTANTE NO BD
               * (PODE SER FEITO POR CONSULTA NA TELA DE BENEFICIÁRIO) E DEPOIS O NOME
               * DEVE SER ALTERADO VIA CONTATO DA CR
               *  */
              if (
                resp.nome
                  .trim()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase() ===
                item.nome
                  .trim()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
              ) {
                const situacao = resp.Vaga[0].Situacao.nome;
                if (situacao !== "ATIVO") {
                  item.found = true;
                  item.update = true;
                  item.situacao = situacao;
                }
              } else {
                item.nome = `*${item.nome}`;
                item.matricula = `*${item.matricula}`;
              }
            }
          } else {
            if (resp.matriculaSec.localeCompare(item.matricula) === 0) {
              /**
               * VERIFICA SE O NOME DO BENEFICIÁRIO É IGUAL AO QUE CONSTA NO BD.
               * EM CASOS ONDE HOUVE UMA MUDANÇA DE NOME (EX. CASAMENTOS E DIVÓRCIOS),
               * O COLABORADOR DEVE ALTERAR O NOME, INSERINDO O NOME CONSTANTE NO BD
               * (PODE SER FEITO POR CONSULTA NA TELA DE BENEFICIÁRIO) E DEPOIS O NOME
               * DEVE SER ALTERADO VIA CONTATO DA CR
               *  */
              if (
                resp.nome
                  .trim()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase() ===
                item.nome
                  .trim()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
              ) {
                const situacao = resp.Vaga[0].Situacao.nome;
                /**
                 * VERIFICA SE A SITUAÇÃO DO BENEFICIÁRIO ENCONTRADO É "ATIVO". SE TIVER
                 * QUALQUER STATUS DIFERENTE DE "ATIVO", O ALGORITMO MARCA PARA ATUALIZAR
                 * O BANCO DE DADOS COM OS VALORES DA PLANILHA
                 */
                if (situacao !== "ATIVO") {
                  item.found = true;
                  item.update = true;
                  item.situacao = situacao;
                }
              } else {
                item.nome = `*${item.nome}`;
                item.matricula = `*${item.matricula}`;
              }
            }
          }
        }
        if (item.cpfAluno) {
          if (
            maskCPF(JSON.stringify(resp.cpf)).localeCompare(
              maskCPF(JSON.stringify(item.cpfAluno))
            ) === 0
          ) {
            /**
             * VERIFICA SE O NOME DO BENEFICIÁRIO É IGUAL AO QUE CONSTA NO BD.
             * EM CASOS ONDE HOUVE UMA MUDANÇA DE NOME (EX. CASAMENTOS E DIVÓRCIOS),
             * O COLABORADOR DEVE ALTERAR O NOME, INSERINDO O NOME CONSTANTE NO BD
             * (PODE SER FEITO POR CONSULTA NA TELA DE BENEFICIÁRIO) E DEPOIS O NOME
             * DEVE SER ALTERADO VIA CONTATO DA CR
             *  */
            if (
              resp.nome
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase() ===
              item.nome
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
            ) {
              const situacao = resp.Vaga[0].Situacao.nome;
              /**
               * VERIFICA SE A SITUAÇÃO DO BENEFICIÁRIO ENCONTRADO É "ATIVO". SE TIVER
               * QUALQUER STATUS DIFERENTE DE "ATIVO", O ALGORITMO MARCA PARA ATUALIZAR
               * O BANCO DE DADOS COM OS VALORES DA PLANILHA
               */
              if (situacao !== "ATIVO") {
                item.found = true;
                item.update = true;
                item.situacao = situacao;
              }
            } else {
              item.nome = `*${item.nome}`;
              item.cpfAluno = `*${item.cpfAluno}`;
            }
          }
        } else {
          item.cpfAluno = ``;
        }
        //MARCA COMO FALSE AUTOMATICAMENTE QUEM NÃO FOI VALIDADO PELA PROCURA NO BD
        if (!item.found) {
          item.found = false;
        }
        if (!item.update) {
          item.update = false;
        }
      });
      return { ...item };
    })
  );
}

/**
 * Validador de campos, formatação de datas e nomes e devolução dos dados para o request. Esta função é
 * para testes, e, portanto, consulta a lista de Demandantes e Municípios por API externa, e precisa ser
 * substituído por um BD quando em produção.
 * @param {Object} entity a entidade do Projeto (Bahia, Tocantins etc). A entidade é provida pela query
 * string da URL da API, em [entity]
 * @param {Object} sheet Objeto contendo os dados que haviam na planilha de importação
 * @returns um Objeto com os dados da planilha já devidamente formatados e normalizados.
 */
async function benefValidateTeste(entity, sheet) {
  try {
    // DEVIDO A ALTERAÇÃO PROPOSTA NA REUNIÃO EM 8/07, A LISTA DE DEMANDANTES E DE MUNICÍPIOS NÃO SERÁ
    // GERADA VIA API EXTERNA. USAR ESSAS OPÇÕES APENAS EM CARÁTER DE TESTE ATÉ A FINALIZAÇÃO DOS ESQUEMAS
    // DE BANCO DE DADOS.
    const listaDemand = await fetchDemandantes(entity);
    const listaMunic = await fetchMunicipios(entity);
    // const listaFormacao = respCurso.data.formacao;
    // const listaEtnia = respEtnia.data.etnia;
    // TESTE
    const listaFormacao = testeCursoDeFormacao;
    const listaEtnia = testeEtnia;
    return await Promise.all(
      sheet.map(async (item) => {
        if (!item.found) {
          //VERIFICA DEMANDANTE PELA SIGLA OU PELO SEU NOME. DEMANDANTES SEM SIGLA NÃO SÃO ACEITOS.
          for (let i = 0; i < listaDemand.length; i++) {
            const itemSiglaListaDemand = listaDemand[i].sigla;
            const itemDemandListaDemand = listaDemand[i].demandante;
            // VERIFICA SE O DEMANDANTE CONTÉM SIGLA
            if (item.demandante.includes("-")) {
              const itemDemand = item.demandante.trim().split("-");
              if (
                itemSiglaListaDemand
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "") ===
                itemDemand[0]
                  .trim()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
              ) {
                //SE A SIGLA FOR ENCONTRADA, RETORNA OS VALORES CONFORME FORMATADO NA API
                item.demandante = `${itemSiglaListaDemand} - ${itemDemandListaDemand}`;
                break;
              }
              // VERIFICA SE O NOME DO DEMANDANTE É IGUAL COM O DA API
              if (
                itemDemand[1]
                  .trim()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase() ===
                itemDemandListaDemand
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
              ) {
                // SE O NOME DO DEMANDANTE FOR IGUAL, RETORNA OS VALORES CONFORME FORMATADO NA API
                item.demandante = `${itemSiglaListaDemand} - ${itemDemandListaDemand}`;
                break;
              }
            }
            // VERIFICA O DEMANDANTE PELO NOME, MESMO SE NÃO CONTÉM SIGLA
            if (
              item.demandante
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase() ===
              itemDemandListaDemand
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
            ) {
              // SE O NOME DO DEMANDANTE FOR IGUAL, RETORNA OS VALORES CONFORME FORMATADO NA API
              item.demandante = `${itemSiglaListaDemand} - ${itemDemandListaDemand}`;
              break;
            }
            // SE FEZ A VARREDURA SOB TODAS AS OPÇÕES E AINDA NÃO ENCONTROU, RETORNA COM * PARA ALTERAÇÃO PELO USUÁRIO
            if (i === listaDemand.length - 1) {
              item.demandante = `*${item.demandante}`;
              break;
            }
          }

          // VERIFICA MUNICÍPIO DA VAGA
          for (let i = 0; i < listaMunic.length; i++) {
            const itemListaMunic = listaMunic[i].municipio;
            // VERIFICA SE O MUNICÍPIO INFORMADO É IGUAL AO LISTADO NA API
            if (
              itemListaMunic
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase() ===
              item.municipioDaVaga
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
            ) {
              //SE SIM, FORMATA CONFORME O DA API
              item.municipioDaVaga = itemListaMunic;
              break;
            }
            // SE FEZ A VARREDURA SOB TODAS AS OPÇÕES  E AINDA NÃO ENCONTROU, RETORNA COM * PARA ALTERAÇÃO PELO USUÁRIO
            if (i === listaMunic.length - 1) {
              item.municipioDaVaga = `*${item.municipioDaVaga}`;
              break;
            }
          }

          // VERIFICA MUNICÍPIO DO ALUNO
          for (let i = 0; i < listaMunic.length; i++) {
            const itemListaMunic = listaMunic[i].municipio;
            if (
              itemListaMunic
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase() ===
              item.municipioDoAluno
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
            ) {
              item.municipioDoAluno = itemListaMunic;
              break;
            }
            // SE FEZ A VARREDURA SOB TODAS AS OPÇÕES  E AINDA NÃO ENCONTROU, RETORNA COM * PARA ALTERAÇÃO PELO USUÁRIO
            if (i === listaMunic.length - 1) {
              item.municipioDoAluno = `*${item.municipioDoAluno}`;
              break;
            }
          }

          // VERIFICA O CURSO DE FORMAÇÃO
          for (let i = 0; i < listaFormacao.length; i++) {
            const itemListaFormacao = listaFormacao[i].formacao;
            if (
              item.cursoDeFormacao
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase() ===
              itemListaFormacao
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
            ) {
              item.cursoDeFormacao = itemListaFormacao;
              break;
            }
            // SE FEZ A VARREDURA SOB TODAS AS OPÇÕES  E AINDA NÃO ENCONTROU, RETORNA COM * PARA ALTERAÇÃO PELO USUÁRIO
            if (i === listaFormacao.length - 1) {
              item.cursoDeFormacao = `*${item.cursoDeFormacao}`;
              break;
            }
          }

          // VALIDA E FORMATA ETNIA
          for (let i = 0; i < listaEtnia.length; i++) {
            const itemListaEtnia = listaEtnia[i].etnia;
            // VERIFICA SE A ETNIA INFORMADA NÃO É NULA OU EM BRANCO
            if (item.raca_cor !== "" && item.raca_cor) {
              if (
                item.raca_cor
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase() ===
                itemListaEtnia
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
              ) {
                //SE A ETNIA FOR IGUAL A INFORMADA PELO BD, APLICA A DO BD
                item.raca_cor = itemListaEtnia;
                break;
              }
              // SE FEZ A VARREDURA SOB TODAS AS OPÇÕES  E AINDA NÃO ENCONTROU, RETORNA COM * PARA ALTERAÇÃO PELO USUÁRIO
              if (i === listaEtnia.length - 1) {
                item.raca_cor = `*${item.raca_cor}`;
                break;
              }
            }
            // SE A ETNIA É NULA OU EM BRANCO, RETORNA COMO "NÃO INFORMADA"
            else {
              item.raca_cor = listaEtnia[0].etnia;
              break;
            }
          }

          // FORMATA NOME DA INSTITUIÇÃO
          item.nomeDoColegio = maskCapitalize(item.nomeDoColegio);

          // FORMATA DATA DE NASCIMENTO
          item.dataDeNascimento = maskDate(
            new Date(item.dataDeNascimento).toLocaleString().split(" ")[0]
          );

          //FORMATA SEXO
          item.sexo = maskCapitalize(item.sexo);

          // FORMATA DATA DE CONVOCAÇÃO
          item.dataDaConvocacao = maskDate(
            new Date(item.dataDaConvocacao).toLocaleString().split(" ")[0]
          );

          //FORMATA NOME
          item.nome = maskCapitalize(item.nome);
        }

        // TESTE - PARA MOSTRAR APENAS OS BENEFICIÁRIOS QUE NÃO FORAM ENCONTRADOS NO BANCO DE DADOS
        // if (!item.found) {
        //   return item;
        // } else return item.found;

        return item;
      })
    );
  } catch (err) {
    console.log(err);
  }
}

// ARRAY COM DADOS DE TESTE
const testeCursoDeFormacao = [
  {
    formacao: "Técnico em Agente Comunitário de Saúde",
    eixo: "Ambiente e Saúde",
  },
  {
    formacao: "Técnico em Análises Químicas",
    eixo: "Controle e Processos Industriais",
  },
  {
    formacao: "Técnico em Química",
    eixo: "Controle e Processos Industriais",
  },
  {
    formacao: "Técnico em Secretaria Escolar",
    eixo: "Desenvolvimento Educacional e Social",
  },
  {
    formacao: "Técnico em Administração",
    eixo: "Gestão e Negócios",
  },
];

// ARRAY COM DADOS DE TESTE
const testeEtnia = [
  {
    etnia: "Não Informada",
  },
  {
    etnia: "Branca",
  },
  {
    etnia: "Indígena",
  },
  {
    etnia: "Preta",
  },
  {
    etnia: "Parda",
  },
  {
    etnia: "Amarela",
  },
];
