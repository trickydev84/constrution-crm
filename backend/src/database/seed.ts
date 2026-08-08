import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  // UsersService runs the same idempotent seed during module initialization.
  await app.get(UsersService);
  await app.close();
}

seed().catch((error) => { console.error(error); process.exit(1); });
