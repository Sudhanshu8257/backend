
import { connectToDatabase } from "./db/connection.js";
import express from "express";
import { config } from "dotenv";
import morgan from "morgan";
import appRouter from "./routes/index.js";
import cookieParser from "cookie-parser";
import cors from "cors";

// ...
const app = express();
const corsConfig = {
  origin: ["http://localhost:5173"],
  credentials: true,
};
config({ path: [".env"] });
app.use(express.json());

app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use("/api/v1", appRouter);
const PORT = process.env.PORT || 3000;
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => console.log("server open"));
  })
  .catch((err) => console.log(err));
