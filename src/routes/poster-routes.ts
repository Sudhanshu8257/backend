import { Router } from "express";
import { getSession, saveSession, stripeWebhook } from "../controllers/poster-controller.js";
import { upload } from "../utils/upload-config.js";
import { generateAnimeController } from "../controllers/image-controller.js";

const posterRoutes = Router();

posterRoutes.post("/generate-anime", upload.single("image"), generateAnimeController);


// "image" matches the name of the input field in your frontend form
posterRoutes.post("/save-session", saveSession);
posterRoutes.get("/session/:sessionId", getSession);
posterRoutes.post("/webhook", stripeWebhook);

export default posterRoutes;