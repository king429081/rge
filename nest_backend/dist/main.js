"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const platform_ws_1 = require("@nestjs/platform-ws");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api');
    app.useWebSocketAdapter(new platform_ws_1.WsAdapter(app));
    await app.listen(3001);
    console.log(`NestJS Backend running on http://localhost:3001`);
}
bootstrap();
//# sourceMappingURL=main.js.map