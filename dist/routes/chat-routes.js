import { Router } from "express";
import { verifyToken } from "../utils/token-manager.js";
import { chatMessageValidator, validate } from "../utils/validators.js";
import { deleteChats, getChat, sendChatsToUser, } from "../controllers/chat-controller.js";
const chatRoutes = Router();
//protected
chatRoutes.post("/new", validate(chatMessageValidator), verifyToken, getChat);
chatRoutes.get("/all-chats", verifyToken, sendChatsToUser);
chatRoutes.delete("/delete", verifyToken, deleteChats);
export default chatRoutes;
//# sourceMappingURL=chat-routes.js.map