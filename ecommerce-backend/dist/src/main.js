"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs_1 = require("fs");
const path_1 = require("path");
const express_1 = __importDefault(require("express"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const uploadsPath = (0, path_1.join)(process.cwd(), 'uploads');
    if (!(0, fs_1.existsSync)(uploadsPath)) {
        (0, fs_1.mkdirSync)(uploadsPath, { recursive: true });
    }
    app.setGlobalPrefix('api');
    app.use('/uploads', express_1.default.static(uploadsPath));
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Ecommerce API')
        .setDescription('Headless SaaS Ecommerce Backend')
        .setVersion('1.0')
        .addApiKey({
        type: 'apiKey',
        name: 'x-store-id',
        in: 'header',
    }, 'x-store-id')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
    }, 'jwt')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    document.security = [
        {
            'x-store-id': [],
        },
    ];
    swagger_1.SwaggerModule.setup('docs', app, document);
    await app.listen(3000);
    console.log(`🚀 Server running on http://localhost:3000`);
    console.log(`📚 Swagger docs on http://localhost:3000/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map