import { Router } from "express";
import { verifyToken } from "../utils/token-manager.js";
import { chatMessageValidator, validate } from "../utils/validators.js";
import { deleteChats, getAllPersonalities, getChatV2, getPersonalityById, getPersonalityByName, getPersonalityMessagesById, sendChatsToUser, } from "../controllers/chat-controller.js";
const chatRoutes = Router();
//protected
chatRoutes.post("/new", validate(chatMessageValidator), verifyToken, getChatV2);
chatRoutes.get("/all-chats", verifyToken, sendChatsToUser);
chatRoutes.delete("/delete", verifyToken, deleteChats);
chatRoutes.get("/getPersonalityMessagesById", verifyToken, getPersonalityMessagesById);
chatRoutes.get("/getPersonalityById", getPersonalityById);
chatRoutes.get("/getAllPersonalities", getAllPersonalities);
chatRoutes.get("/getPersonalityByName", getPersonalityByName);
export default chatRoutes;
//# sourceMappingURL=chat-routes.js.map