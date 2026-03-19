"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const document_service_1 = require("../document/document.service");
const openai_1 = __importDefault(require("openai"));
let ChatService = class ChatService {
    constructor(documentService) {
        this.documentService = documentService;
        this.openai = new openai_1.default({
            apiKey: 'sk-cp-NMCZTmS0NNdeHAt0q1u5cIx6tTgdI8yvR7XjvSrWVqjBeFFz0i879cIsyIyTUCheBPb7hD6zwpQSgwrdDzPChALLZOMnt3KVXS_8b2y2ZiR5LxE5aZo2wCY',
            baseURL: 'https://api.minimax.chat/v1',
        });
    }
    async *streamChat(sessionId, message) {
        const history = await this.documentService.getChatHistory(sessionId, message, 10);
        const docResults = await this.documentService.searchDocuments(message);
        const sources = docResults.length > 0
            ? [...new Set(docResults.map((r) => r.payload.filename))]
            : [];
        const docContext = docResults.length > 0
            ? docResults.map((r) => r.payload.chunk).join('\n\n')
            : '';
        const messages = [{
                role: 'system',
                content: docResults.length > 0
                    ? '你是helpful助手。基于对话历史和提供的文档回答，并注明来源。'
                    : '你是helpful助手。',
            }];
        history.forEach((msg) => {
            messages.push({ role: msg.role, content: msg.content });
        });
        const userContent = docContext
            ? `相关文档:\n${docContext}\n\n问题: ${message}`
            : message;
        messages.push({ role: 'user', content: userContent });
        const stream = await this.openai.chat.completions.create({
            model: 'MiniMax-Text-01',
            messages,
            stream: true,
        });
        let fullResponse = '';
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                yield { type: 'chunk', content };
            }
        }
        await this.documentService.addChatMessage(sessionId, 'user', message);
        await this.documentService.addChatMessage(sessionId, 'assistant', fullResponse);
        yield { type: 'done', sources };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [document_service_1.DocumentService])
], ChatService);
//# sourceMappingURL=chat.service.js.map