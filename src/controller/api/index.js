import axios from "axios";


/**
 * Controller que lista os Demandantes baseado no Estado (ou na entity).
 * Consulta uma API externa para prover os dados desejados. Este controller
 * é utilizado para testes; o de Produção deve utilizar uma consulta via BD.
 * @param {Object} entity a entidade do Projeto (Bahia, Tocantins etc). 
 * A entidade é provida pela query string da URL da API, em [entity]
 * @returns Objeto JSON contendo a sigla do Demandante e o nome do Demandante
 */
export async function fetchDemandantes(entity) {
    try {
      switch (entity) {
        case "ba": {
            // API DE DEMANDANTES DA SECRETARIA DO GOVERNO DO ESTADO DA BAHIA
            const url = `${process.env.NEXT_PUBLIC_BA_API_DEMAND}`
            const fetch = await axios.get(url);
            return fetch.data.map((item) => {
                return {
                  sigla: item.sigla,
                  demandante: item.nome,
                };
              });
        }
        default: {
          return {message: "entity not found"}
        }
      }
    } catch (error) {
      return {message: "Erro ao buscar pelos Demandantes via API externa.", error: error.message}
    }
  }


  /**
 * Controller que lista os Municípios baseado no Estado (ou na entity).
 * Consulta uma API externa para prover os dados desejados. Este controller
 * é utilizado para testes; o de Produção deve utilizar uma consulta via BD.
 * @param {Object} entity a entidade do Projeto (Bahia, Tocantins etc). 
 * A entidade é provida pela query string da URL da API, em [entity]
 * @returns Objeto JSON contendo o id do Município e o nome do Município
 */
 export  async function fetchMunicipios(entity) {
    try {
      // API DO IBGE PARA MUNICÍPIOS E REGIÕES METROPOLITANAS
      const url = `${process.env.NEXT_PUBLIC_API_MUNIC}/${entity}/municipios`;
      const fetch = await axios.get(url);
      return fetch.data.map((item) => {
        return {
          id: item.id,
          municipio: item.nome,
        };
      });
    } catch (error) {
      return {message: "Erro ao buscar pelos Municípios via API externa", error: error.message}
    }
  }