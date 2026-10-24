import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable strict global validation based on DTO classes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are provided
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    }),
  );

  // Configure OpenAPI (Swagger) documentation
  const config = new DocumentBuilder()
    .setTitle('Smart Logistics Routing API')
    .setDescription(
      'RESTful API for finding the most efficient path between locations applying Dijkstra algorithm constraints.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Serve the Swagger UI exactly at the /docs endpoint as requested
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
  console.log(`🚀 Application is running on: http://localhost:3000`);
  console.log(`📚 Swagger documentation available at: http://localhost:3000/docs`);
}
bootstrap();