import axios from "axios";
import { allowCors } from "utils/allowCors";

const handler = async (req, res) => {
  try {
    const {entity, id, municipio} = req.query;
    const fetch = await fetchMunicipios(entity);
    const munic = fetch.data.map((item) => {
      if (item.id == id) {
        return {
          id: item.id,
          municipio: item.nome,
        };
      } else if (item.municipio == municipio) {
        return {
          id: item.id,
          municipio: item.nome,
        };
      }
    });
    return res
      .status(200)
      .setHeader("Acess-Control-Allow-Origin", "*")
      .json({status: "ok", munic});
  } catch (error) {
    return res
      .status(500)
      .setHeader("Acess-Control-Allow-Origin", "*")
      .json({ error: error.message });
  }
};

async function fetchMunicipios(entity) {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_MUNIC}/${entity}/municipios`;
    return await axios.get(url);
  } catch (error) {
    //const url = `${process.env.NEXT_PUBLIC_API_MUNIC_FALLBACK}/${entity}`
    const url = `${process.env.NEXT_PUBLIC_API_MUNIC}/${entity}/municipios`;
    return await axios.get(url);
  }
}

export default allowCors(handler);
