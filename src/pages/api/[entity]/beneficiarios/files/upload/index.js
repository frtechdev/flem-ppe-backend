import multer from "multer";
import nc from "next-connect";
import { allowCors } from "services/apiAllowCors";

const filepth = `${process.env.NEXT_PUBLIC_UPLOAD_TEMP_DIR}`;

/**
 * INSTANCIA O MULTER PARA REALIZAR O SALVAMENTO DO ARQUIVO
 * BASEADO NO REQUEST HTTP
 * */
const upload = multer({
  storage: multer.diskStorage({
    destination: filepth,
    filename: (req, file, cb) => {
      return cb(null, file.originalname);
    },
  }),
});

// Handler do NextConnect. Chama o handler dessa conexão.
const handler = nc({
  onError: (err, req, res, next) => {
    res.status(500).end("Something broke!");
  },
  onNoMatch: (req, res) => {
    res.status(404).end("Page is not found");
  },
});

// MANIPULA O ARQUIVO RECEBIDO DO UPLOAD E DEVOLVE COMO OBJETO
handler.use(upload.array("files"));
handler.post((req, res) => {
  try {
    req.on("close", () => console.log("cancelado"));
    console.log(req.files[0].filename);
    return res.status(200).json({ ok: true, file: req.files[0].filename });
  } catch (error) {
    // MANIPULAÇÃO DE EXCEÇÃO (NÃO TRATADA)
    return res.status(500).json({
      status: "error",
      message: "FALHA NA EXECUÇÃO.",
      error: error.message,
    });
  }
});

handler.patch(async (req, res) => {
  throw new Error("Throws me around! Error can be caught and handled.");
});

//FORÇA O PARSING CORRETO PARA O CORPO DO CONTEÚDO DO UPLOAD
export const config = {
  api: {
    bodyParser: false,
  },
};

export default allowCors(handler);
