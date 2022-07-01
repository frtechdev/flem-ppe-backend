import axios from "axios";
import { allowCors } from "utils/allowCors";

const handler = async (req, res) => {
  try {
    const {entity, sigla, demandante} =  req.query;
    const fetch = await fetchDemandantes(entity);
    if (sigla) {
      const demand = fetch.data
        .filter((item) => item.sigla == sigla)
        .map((item2) => {
          return {
            sigla: item2.sigla,
            demandante: item2.nome,
          };
        });
      return (
        res
          .status(200)
          .json({status: "ok", demand})
      );
    } else if (demandante) {
      const demand = fetch.data
        .filter((item) => item.demandante == demandante)
        .map((item2) => {
          return {
            sigla: item2.sigla,
            demandante: item2.nome,
          };
        });
      return (
        res
          .status(200)
          .json({status: "ok", demand})
      );
    } else {
      const demand = fetch.data.map((item) => {
        return {
          sigla: item.sigla,
          demandante: item.nome,
        };
      });
      return (
        res
          .status(200)
          .json({status: "ok", demand})
      );
    }
  } catch (error) {
    return (
      res
        .status(500)
        .json({ error: error.message })
    );
  }
};

async function fetchDemandantes(entity) {
  try {
    switch (entity) {
      case "ba": {
        return await axios.get(process.env.NEXT_PUBLIC_BA_API_DEMAND);
      }
      default: {
        break;
      }
    }
  } catch (error) {
    //return await axios.get(process.env.NEXT_PUBLIC_BA_API_DEMAND);
  }
}

export default allowCors(handler);
