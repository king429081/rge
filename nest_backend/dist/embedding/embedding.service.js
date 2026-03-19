"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
let EmbeddingService = class EmbeddingService {
    constructor() {
        this.PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001/embed';
    }
    async getEmbeddings(texts) {
        const response = await fetch(this.PYTHON_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts }),
        });
        if (!response.ok) {
            throw new Error(`Embedding service error: ${response.statusText}`);
        }
        const result = await response.json();
        return result.embeddings;
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = __decorate([
    (0, common_1.Injectable)()
], EmbeddingService);
//# sourceMappingURL=embedding.service.js.map