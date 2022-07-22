import { fetchDemandantes } from "controller/api";
import { allowCors } from "services/apiAllowCors";

/**
 * Fornece demandantes e listas de demandantes, conforme critérios (sigla e nome do demandante).
 * Recebe um request HTTP com os seguintes parâmetros:
 * entity - a entidade do Projeto (Bahia, Tocantins etc). É dinamicamente
 * atribuído pelo caminho da requisição à API.
 * sigla - a sigla do demandante.
 * demandante - o nome do demandante.
 * @param {Object} req HTTP request.
 * @param {Object} res HTTP response
 * @returns HTTP response como JSON contendo a resposta da query consultada.
 */
const handler = async (req, res) => {
  try {
    if (req.method === "GET") {
      const { entity, sigla, demandante } = req.query;
      //EM CARÁTER DE TESTE, ESTÁ GERANDO VIA API EXTERNA. ALTERAR PARA CONSULTA VIA BD INTERNO APÓS
      // CRIAÇÃO DO ESQUEMA.
      const fetch = await fetchDemandantes(entity);
      if (sigla || demandante) {
        const demand = fetch.filter((item) => {
          if (item.sigla === sigla || item.demandante === demandante) {
            return {
              sigla: item.sigla,
              demandante: item.demandante,
            };
          }
        });
        return res.status(200).json({ status: "ok", demand });
      } else {
        const demand = fetch.map((item) => {
          return {
            sigla: item.sigla,
            demandante: item.demandante,
          };
        });
        return res.status(200).json({ status: "ok", demand });
      }
    }
    else if (req.method === "PUT"){
      // CRIAR MÉTODO PUT PARA INSERÇÃO NO BD
    }
    else{
      return res.status(405).json({ status: 405, message: "METHOD NOT ALLOWED" });
    }
  } catch (error) {
    return res.status(500).json({ status: 500, message: "FALHA AO PROCESSAR A SOLICITAÇÃO HTTP.", error: error.message });
  }
};

export default allowCors(handler);
