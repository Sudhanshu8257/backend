import { Router } from "express";
import userRoutes from "./user-routes.js";
import chatRoutes from "./chat-routes.js";
import { welcomeMessage } from "../utils/constants.js"
const appRouter = Router();

appRouter.use("/user", userRoutes); //domain/api/v1/user
appRouter.use("/chat", chatRoutes); //domain/api/v1/chats
app.get('/', (req, res) => {
  const message = welcomeMessage();
  res.send({ message });
});

export default appRouter;
