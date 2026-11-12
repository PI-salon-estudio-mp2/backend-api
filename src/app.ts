import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { openapiSpec } from "./docs/openapi";
import { errorHandler, notFound } from "./middlewares/error.middleware";
import { router } from "./routes";

export const app = express();

app.disable("x-powered-by");
// Render está detrás de un proxy: así req.ip y req.protocol son los reales.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10kb" }));

app.get("/", (_req, res) => res.redirect("/docs"));
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: "API Salón de Estudio · Swagger",
    swaggerOptions: { persistAuthorization: true },
  })
);
app.use(router);

app.use(notFound);
app.use(errorHandler);
