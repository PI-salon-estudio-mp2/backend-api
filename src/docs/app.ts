import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env";
import { openapiSpec } from "./openapi";
import { errorHandler, notFound } from "../middlewares/error.middleware";
import { router } from "../routes";

export const app = express();

app.use(cors({ origin: env.corsOrigins }));
app.use(express.json());

app.get("/", (_req, res) => res.redirect("/docs"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.use(router);

app.use(notFound);
app.use(errorHandler);