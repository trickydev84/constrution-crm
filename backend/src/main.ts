import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
async function bootstrap() { const app = await NestFactory.create(AppModule); app.setGlobalPrefix('api'); app.enableCors({ origin: true, credentials: true }); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); const docs = new DocumentBuilder().setTitle('Construction CRM API').setVersion('1.0').addBearerAuth().build(); SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, docs)); await app.listen(process.env.PORT || 4000); }
bootstrap();
