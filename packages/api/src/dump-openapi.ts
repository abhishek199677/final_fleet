import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

/** Dumps the OpenAPI document for the drift gate. Run after `nest build`: node dist/dump-openapi */
async function dump() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('Fleet OS API')
    .setDescription('Multi-tenant SaaS for heavy-equipment operators')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const out = path.join(__dirname, '..', 'openapi.json');
  fs.writeFileSync(out, JSON.stringify(document, null, 2));
  // eslint-disable-next-line no-console
  console.log(`OpenAPI written to ${out}`);
  await app.close();
}

dump().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
