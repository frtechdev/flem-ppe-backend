import axios from "axios";
import nc from "next-connect";
import { allowCors } from "utils/allowCors";
import { maskCapitalize } from "utils/masks/maskCapitalize";
import { maskCPF } from "utils/masks/maskCPF";
import { maskDate } from "utils/masks/maskDate";
import { phoneNumberFixer } from "utils/phoneNumberFixer";
import { readFile, utils } from "xlsx";

/* load the codepage support library for extended support with older formats  */

const handler = nc({
  onError: (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).end("Something broke!");
  },
  onNoMatch: (req, res) => {
    res.status(404).end("Page is not found");
  },
});

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

const SHEETS_COLUMNS = [
  //"ano",
  //"territorio",
  "demandante",
  //"modalidade",
  //"tipoDeVinculo",
  "municipioDaVaga",
  "municipioDoAluno",
  "nomeDoColegio",
  "eixoDeFormacao",
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

try {
  handler.get(async (req, res) => {
    const { filename, entity } = req.query;
    const filepth = `${process.env.NEXT_PUBLIC_UPLOAD_TEMP_DIR}/${filename}`;
    const workbook = readFile(filepth, {
      type: "array",
      cellDates: true,
    });
    const sheet = {};
    workbook.SheetNames.forEach((sheetName) => {
      const rawRows = utils.sheet_to_json(workbook.Sheets[sheetName], {
        raw: true,
        defval: null,
      });
      rawRows.map((row) => replaceKeys(row));
      const filterColumns = rawRows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key]) => SHEETS_COLUMNS.includes(key))
        )
      );
      const rows = filterColumns
        .filter((row) => Object.keys(row).length === SHEETS_COLUMNS.length)
        .map((row) => ({
          ...row,
          telefone01: phoneNumberFixer(row.telefone01, "BR"),
          telefone02: phoneNumberFixer(row.telefone02, "BR"),
        }));
      if (rows.length > 0) {
        sheet[sheetName] = rows;
      }
    });
    if (Object.keys(sheet).length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "invalid file columns" });
    }

    // PRIMEIRA VALIDAÇÃO - VERIFICA NO BANCO BENEFICIÁRIOS JÁ LISTADOS
    const output1 = await benefLookup(entity, sheet);

    // SEGUNDA VALIDAÇÃO - CONFERE CAMPOS SE COMUNICANDO COM API E BD E OS FORMATA
    const output2 = await benefValidate(entity, output1);

    return res.status(200).json({ ok: true, output2 });
  });

  handler.patch(async (req, res) => {
    throw new Error("Throws me around! Error can be caught and handled.");
  });
} catch (err) {
  console.log(err);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default allowCors(handler);

async function benefLookup(entity, sheet) {
  const sheets = Object.values(sheet["Plan1"]);
  const matriculas =
    '["' + sheets.map((item) => item.matricula).join('","') + '"]';
  const cpfs = '["' + sheets.map((item) => item.cpfAluno).join('","') + '"]';

  const urlAPIMatricula = `${process.env.NEXT_PUBLIC_API_PPE_BD_LEGADO}/${entity}/beneficiarios?matriculaSec=${matriculas}`;
  const urlAPICpf = `${process.env.NEXT_PUBLIC_API_PPE_BD_LEGADO}/${entity}/beneficiarios?cpf=${cpfs}`;

  const respByMatricula = await axios.get(urlAPIMatricula);
  const respByCpf = await axios.get(urlAPICpf);

  return await Promise.all(
    sheets.map(async (item) => {
      //PROCURA BENEFICIÁRIO PELA MATRÍCULA DA SECRETARIA
      if (
        item.matricula !== null &&
        item.matricula.toString().trim().length > 0
      ) {
        respByMatricula.data.query.forEach((resp) => {
          if (entity === "ba") {
            if (resp.matriculaSAEB.localeCompare(item.matricula) === 0) {
              item.found = true;
            }
          } else {
            if (resp.matriculaSec.localeCompare(item.matricula) === 0) {
              item.found = true;
            }
          }
        });
      }
      // EM CASO DE FALHA NA PROCURA PELA MATRÍCULA OU PELO NOME, PROCURA PELO CPF
      if (
        item.cpfAluno !== "" &&
        item.cpfAluno !== null &&
        item.cpfAluno.toString().trim().length > 0
      ) {
        respByCpf.data.query.forEach((resp) => {
          if (
            maskCPF(JSON.stringify(resp.cpf)).localeCompare(
              maskCPF(JSON.stringify(item.cpfAluno))
            ) === 0
          ) {
            item.found = true;
          }
        });
      } else {
        item.cpfAluno = ``;
      }
      if (!item.found) {
        item.found = false;
      }
      return { ...item };
    })
  );
}

async function benefValidate(entity, sheet) {
  try {
    const localAPIURL = `http://localhost:${process.env.NEXT_PUBLIC_PORT}`;
    const urlApiDemand = `/api/${entity}/demandantes`;
    const urlApiMunic = `/api/${entity}/municipios`;
    //const urlApiFormacao = `/api/${entity}/formacoes`;
    //const urlApiEtnia =  `/api/${entity}/etnias`;
    const respDemand = await axios({
      method: "get",
      baseURL: localAPIURL,
      url: urlApiDemand,
    });
    const respMunic = await axios({
      method: "get",
      baseURL: localAPIURL,
      url: urlApiMunic,
    });
    // const respFormacao = await axios({
    //   method: "get",
    //   baseURL: localAPIURL,
    //   url: urlApiFormacao,
    // });
    // const respEtnia = await axios({
    //   method: "get",
    //   baseURL: localAPIURL,
    //   url: urlApiEtnia,
    // });
    const listaDemand = respDemand.data.demand;
    const listaMunic = respMunic.data.munic;
    // const listaFormacao = respCurso.data.formacao;
    // const listaEtnia = respEtnia.data.etnia;
    // TESTE
    const listaFormacao = testeCursoDeFormacao;
    const listaEtnia = testeEtnia;
    return await Promise.all(
      sheet.map(async (item) => {
        //FORMATA NOME
        item.nome = maskCapitalize(item.nome);

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

        if (item.found) {
          // FORMATA DEMANDANTE
          if (item.demandante.includes("-")) {
            const itemDemand = item.demandante.trim().split("-");
            item.demandante = `${itemDemand[0]} - ${maskCapitalize(
              itemDemand[1]
            )}`;
          } else {
            item.demandante = maskCapitalize(item.demandante);
          }

          // FORMATA MUNICÍPIO DA VAGA
          item.municipioDaVaga = maskCapitalize(item.municipioDaVaga);

          // FORMATA MUNICÍPIO DO ALUNO
          item.municipioDoAluno = maskCapitalize(item.municipioDoAluno);

          // FORMATA EIXO DE FORMAÇÃO
          item.eixoDeFormacao = maskCapitalize(item.eixoDeFormacao);

          // FORMATA CURSO DE FORMAÇÃO
          item.cursoDeFormacao = maskCapitalize(item.cursoDeFormacao);

          // FORMATA ETNIA
          item.raca_cor = maskCapitalize(item.raca_cor);
        } else {
          //VERIFICA DEMANDANTE PELA SIGLA OU PELO SEU NOME. DEMANDANTES SEM SIGLA NÃO SÃO ACEITOS.
          for (let i = 0; i < listaDemand.length; i++) {
            const itemSiglaListaDemand = listaDemand[i].sigla;
            const itemDemandListaDemand = listaDemand[i].demandante;
            if (item.demandante.includes("-")) {
              const itemDemand = item.demandante.trim().split("-");
              if (
                maskCapitalize(itemSiglaListaDemand).localeCompare(
                  itemDemand[0]
                ) === 0 ||
                maskCapitalize(itemDemandListaDemand).localeCompare(
                  itemDemand[1]
                )
              ) {
                item.demandante = `${itemSiglaListaDemand} - ${itemDemandListaDemand}`;
                break;
              } else if (i === listaDemand.length - 1) {
                item.demandante = `*${item.demandante}`;
                break;
              }
            } else {
              item.demandante = `*${item.demandante}`;
              break;
            }
          }

          // VERIFICA MUNICÍPIO DA VAGA
          for (let i = 0; i < listaMunic.length; i++) {
            const itemListaMunic = listaMunic[i].municipio;
            if (
              maskCapitalize(itemListaMunic).localeCompare(
                item.municipioDaVaga
              ) === 0
            ) {
              item.municipioDaVaga = itemListaMunic;
              break;
            } else if (i === listaMunic.length - 1) {
              item.municipioDaVaga = `*${item.municipioDaVaga}`;
              break;
            }
          }

          // VERIFICA MUNICÍPIO DO ALUNO
          for (let i = 0; i < listaMunic.length; i++) {
            const itemListaMunic = listaMunic[i].municipio;
            if (
              maskCapitalize(itemListaMunic).localeCompare(
                item.municipioDoAluno
              ) === 0
            ) {
              item.municipioDoAluno = itemListaMunic;
              break;
            } else if (i === listaMunic.length - 1) {
              item.municipioDoAluno = `*${item.municipioDoAluno}`;
              break;
            }
          }

          /**
           * VALIDA O EIXO DE FORMAÇÃO E O CURSO, COMPARANDO PRIMEIRAMENTE
           * O CURSO INFORMADO COM A LISTA CONTIDA NO BD. CASO NÃO ENCONTRE,
           * MARCA O CAMPO DE CURSO E O CAMPO DE EIXO COMO PENDENTES CORREÇÃO;
           * CASO ENCONTRE O CURSO, MAS O EIXO NÃO ESTEJA CORRETO, FORÇA O EIXO A SE
           * ADEQUAR PELO CURSO DE FORMAÇÃO, JÁ QUE NÃO PODEM HAVER CURSOS COM NOMES IGUAIS
           * E EIXOS DIFERENTES.
           * CASO NÃO ENCONTRE O CURSO, MARCA O EIXO E O CURSO COMO PENDENTES CORREÇÃO.
           */
          for (let i = 0; i < listaFormacao.length; i++) {
            const itemListaFormacao = listaFormacao[i].formacao;
            const itemListaEixo = listaFormacao[i].eixo;
            if (
              maskCapitalize(itemListaFormacao).localeCompare(
                item.cursoDeFormacao
              ) === 0
            ) {
              item.cursoDeFormacao = itemListaFormacao;
              if (
                maskCapitalize(itemListaEixo).localeCompare(
                  item.eixoDeFormacao
                ) === 0
              ) {
                item.eixoDeFormacao = itemListaEixo;
              } else {
                item.eixoDeFormacao = `*${item.eixoDeFormacao}`;
              }
              break;
            } else if (i === listaFormacao.length - 1) {
              item.eixoDeFormacao = `*${item.eixoDeFormacao}`;
              item.cursoDeFormacao = `*${item.cursoDeFormacao}`;
              break;
            }
          }

          // VALIDA E FORMATA ETNIA
          for (let i = 0; i < listaEtnia.length; i++) {
            const itemListaEtnia = listaEtnia[i].etnia;
            if (item.raca_cor !== "") {
              if (
                maskCapitalize(itemListaEtnia).localeCompare(item.raca_cor) ===
                0
              ) {
                item.raca_cor = itemListaEtnia;
                break;
              } else if (i === listaEtnia.length - 1) {
                item.raca_cor = `*${item.raca_cor}`;
                break;
              }
            } else {
              item.raca_cor = listaEtnia[0].etnia;
              break;
            }
          }
        }

        return item;
      })
    );
  } catch (err) {
    console.log(err);
  }
}

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
