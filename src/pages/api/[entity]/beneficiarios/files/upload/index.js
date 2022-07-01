import multer from "multer";
import nc from "next-connect";
import { allowCors } from "utils/allowCors";

const filepth = (`${process.env.NEXT_PUBLIC_UPLOAD_TEMP_DIR}`);

const upload = multer({
  storage: multer.diskStorage({
    destination: filepth,
    filename: (req, file, cb) => {
      return cb(null, file.originalname);
    },
  }),
});

const handler = nc({
  onError: (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).end("Something broke!");
  },
  onNoMatch: (req, res) => {
    res.status(404).end("Page is not found");
  },
});

try {
  handler.use(upload.array("files"));
  handler.post((req, res) => {
    req.on("close", () => console.log("cancelado"));
    console.log(req.files[0].filename);
    return res.status(200).json({ ok: true, file: req.files[0].filename });
  });

  handler.patch(async (req, res) => {
    throw new Error("Throws me around! Error can be caught and handled.");
  });
} catch (error) {
  console.log(error);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default allowCors(handler);
