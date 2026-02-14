import { Router } from "express";
import { upload } from "../utils/upload-config.js";
import { generateAnimeController } from "../controllers/image-controller.js";

const imageRoutes = Router();

// "image" matches the name of the input field in your frontend form
imageRoutes.post("/generate-anime", upload.single("image"), generateAnimeController);

export default imageRoutes;