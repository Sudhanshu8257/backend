import { Router } from "express";
import {
  generateAnimeImage,
  getSession,
  getSessionState,
  saveSession,
  startSession,
  stripeWebhook,
} from "../controllers/poster-controller.js";
import { upload } from "../utils/upload-config.js";
const posterRoutes = Router();

posterRoutes.post("/webhook", stripeWebhook);

posterRoutes.post("/new", startSession);
posterRoutes.get("/session/:sessionId", getSessionState);


posterRoutes.post("/save", saveSession);
posterRoutes.get("/download/:sessionId", getSession);

posterRoutes.post(
  "/generate-anime",
  upload.single("image"),
  generateAnimeImage,
);

export default posterRoutes;
