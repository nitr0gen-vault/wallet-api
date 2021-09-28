import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'typeorm';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';


dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  useContainer(app.select(AppModule), {fallbackOnErrors: true});

  app.enableCors({origin: '*'});

  const config = new DocumentBuilder()
    .setTitle('Nitr0gen Gateway Services')
    //.setDescription('Nitr0gen Service')
    .setVersion('1.0')
    //.addTag('security')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const PORT = Number(process.env.PORT) || 8080;
  await app.listen(PORT);
}
bootstrap();
