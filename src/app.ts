import express from "express";
import cors from "cors";
import identifyRouter from "./routes/identify";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/identify", identifyRouter);

app.get("/", (_, res) => {
  res.send("Bitespeed Backend Task API is running");
});

export default app;
