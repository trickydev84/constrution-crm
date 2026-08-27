import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as compression from "compression";
import helmet from "helmet";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Default CSP breaks Swagger UI's inline bootstrap script at /docs, and buys little for a JSON API
  // whose only HTML surface is that same docs page — disabled rather than hand-tuned for one page.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",").map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins.includes("*") ? true : allowedOrigins, credentials: true });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const docs = new DocumentBuilder()
    .setTitle("Construction CRM API")
    .setDescription(
      "REST API for the Construction CRM backend. Authenticate via POST /api/auth/login or /api/auth/register, then use the returned accessToken with the Authorize button below.",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, docs));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
