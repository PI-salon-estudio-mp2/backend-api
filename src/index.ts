import { app } from "./docs/app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`backend-api escuchando en el puerto ${env.port}`);
});