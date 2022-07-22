import { fetchMunicipios } from "controller/api";
import { allowCors } from "services/apiAllowCors";


/**
 * Fornece municípios e listas de municípios, conforme critérios (id e nome do município).
 * Recebe um request HTTP com os seguintes parâmetros:
 * entity - a entidade do Projeto (Bahia, Tocantins etc). É dinamicamente
 * atribuído pelo caminho da requisição à API.
 * id - o ID do município.
 * demandante - o nome do demandante.
 * @param {Object} req HTTP request.
 * @param {Object} res HTTP response
 * @returns HTTP response como JSON contendo a resposta da query consultada.
 */
const handler = async (req, res) => {
  try {
    if (req.method === "GET") {
      const { entity, id, municipio } = req.query;
      //EM CARÁTER DE TESTE, ESTÁ GERANDO VIA API EXTERNA. ALTERAR PARA CONSULTA VIA BD INTERNO APÓS
      // CRIAÇÃO DO ESQUEMA.
      const fetch = await fetchMunicipios(entity);
      if (id || municipio) {
        const munic = fetch.filter((item) => {
          if (item.id === id || item.municipio === municipio) {
            return {
              id: item.id,
              municipio: item.nome,
            };
          }
        });
        return res.status(200).json({ status: "ok", munic });
      } else {
        const munic = fetch;
        return res.status(200).json({ status: "ok", munic });
      }
    } else if (req.method === "PUT") {
      // CRIAR MÉTODO PUT PARA INSERÇÃO NO BD
    } else {
      return res.status(405).json({ status: 405, message: "METHOD NOT ALLOWED" });
    }
  } catch (error) {
    return res.status(500).json({ status: 500, message: "FALHA AO PROCESSAR A SOLICITAÇÃO HTTP.", error: error.message });
  }
};

export default allowCors(handler);
