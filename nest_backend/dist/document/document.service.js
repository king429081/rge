"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const common_1 = require("@nestjs/common");
const qdrant_service_1 = require("../qdrant/qdrant.service");
const embedding_service_1 = require("../embedding/embedding.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf = __importStar(require("pdf-parse"));
const mammoth = __importStar(require("mammoth"));
const uuid_1 = require("uuid");
let DocumentService = class DocumentService {
    constructor(qdrantService, embeddingService) {
        this.qdrantService = qdrantService;
        this.embeddingService = embeddingService;
        this.documents = new Map();
        this.chatHistoryCounter = 1;
    }
    async uploadFile(file) {
        const docId = (0, uuid_1.v4)();
        const { originalname, path: filePath } = file;
        console.log(`\n========== 文件上传开始 ==========`);
        console.log(`📄 文件: ${originalname}`);
        console.log('🔄 步骤1: 提取文本...');
        const { text, pageCount } = await this.extractText(filePath, originalname);
        console.log(`✅ 文本长度: ${text.length} 字符, 页数: ${pageCount}`);
        console.log('🔄 步骤2: 分块...');
        const chunks = this.chunkText(text);
        console.log(`✅ 分块完成: ${chunks.length} 个块`);
        console.log('🔄 步骤3: 生成向量并存储...');
        for (let i = 0; i < chunks.length; i++) {
            const result = await this.embeddingService.getEmbeddings([chunks[i]]);
            await this.qdrantService.upsertPoints(this.qdrantService.getCollectionName(), [{
                    id: i + 1,
                    vector: result[0],
                    payload: { docId, filename: originalname, chunk: chunks[i], chunkIndex: i },
                }]);
            console.log(`   ✅ ${i + 1}/${chunks.length}`);
        }
        const doc = {
            id: docId,
            filename: originalname,
            uploadDate: new Date().toISOString(),
            chunkCount: chunks.length,
        };
        this.documents.set(docId, doc);
        fs.unlinkSync(filePath);
        console.log('========== 上传完成 ==========\n');
        return doc;
    }
    async getDocuments() {
        return Array.from(this.documents.values());
    }
    async deleteDocument(id) {
        const doc = this.documents.get(id);
        if (!doc)
            return { success: false };
        const result = await this.qdrantService.scroll(this.qdrantService.getCollectionName(), { must: [{ key: 'docId', match: { value: id } }] }, 1000);
        if (result.result && result.result.length > 0) {
            await this.qdrantService.deletePoints(this.qdrantService.getCollectionName(), result.result.map((p) => p.id));
        }
        this.documents.delete(id);
        return { success: true };
    }
    async addChatMessage(sessionId, role, content) {
        const result = await this.embeddingService.getEmbeddings([content]);
        await this.qdrantService.upsertPoints(this.qdrantService.getChatCollectionName(), [{
                id: this.chatHistoryCounter++,
                vector: result[0],
                payload: { sessionId, role, content, timestamp: Date.now() },
            }]);
    }
    async getChatHistory(sessionId, query, limit = 10) {
        if (!query) {
            const result = await this.qdrantService.scroll(this.qdrantService.getChatCollectionName(), { must: [{ key: 'sessionId', match: { value: sessionId } }] }, 100);
            return (result.result || [])
                .map((p) => p.payload)
                .sort((a, b) => a.timestamp - b.timestamp);
        }
        const result = await this.embeddingService.getEmbeddings([query]);
        const searchResult = await this.qdrantService.search(this.qdrantService.getChatCollectionName(), result[0], limit);
        return searchResult
            .filter((r) => r.payload.sessionId === sessionId)
            .map((r) => r.payload)
            .sort((a, b) => a.timestamp - b.timestamp);
    }
    async searchDocuments(query) {
        const result = await this.embeddingService.getEmbeddings([query]);
        return this.qdrantService.search(this.qdrantService.getCollectionName(), result[0], 5);
    }
    async extractText(filePath, filename) {
        const ext = path.extname(filename).toLowerCase();
        if (ext === '.txt') {
            const content = fs.readFileSync(filePath, 'utf-8');
            return { text: content.trim(), pageCount: 1 };
        }
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return { text: data.text.trim(), pageCount: data.numpages };
        }
        if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            return { text: result.value.trim(), pageCount: 1 };
        }
        throw new Error('Unsupported file type');
    }
    chunkText(text, chunkSize = 500) {
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize - 50) {
            chunks.push(text.slice(i, i + chunkSize));
        }
        return chunks;
    }
};
exports.DocumentService = DocumentService;
exports.DocumentService = DocumentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [qdrant_service_1.QdrantService,
        embedding_service_1.EmbeddingService])
], DocumentService);
//# sourceMappingURL=document.service.js.map