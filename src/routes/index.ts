import { Router } from "express";
import userRoutes from "./user-routes.js";
import chatRoutes from "./chat-routes.js";
import { welcomeMessage } from "../utils/constants.js"
const appRouter = Router();

appRouter.use("/user", userRoutes); //domain/api/v1/user
appRouter.use("/chat", chatRoutes); //domain/api/v1/chats
appRouter.get("/", (req, res) => {
  const message = welcomeMessage();
    res.send(`<p style="background-image: linear-gradient(to right, #f77979, #9b59b6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-size: 2em;
    margin-top: 24px;
    padding: 10px;
    text-align: center;
    border-radius: 5px;">${message}</p>`);
  });
export default appRouter;
