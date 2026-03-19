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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantService = void 0;
const common_1 = require("@nestjs/common");
const js_client_rest_1 = require("@qdrant/js-client-rest");
let QdrantService = class QdrantService {
    constructor() {
        this.COLLECTION_NAME = 'rag_documents';
        this.CHAT_COLLECTION = 'chat_history';
        this.VECTOR_SIZE = 384;
        this.client = new js_client_rest_1.QdrantClient({
            url: 'http://localhost:6333',
        });
    }
    async onModuleInit() {
        await this.initCollections();
    }
    async initCollections() {
        try {
            await this.client.deleteCollection(this.COLLECTION_NAME);
        }
        catch (e) { }
        await this.client.createCollection(this.COLLECTION_NAME, {
            vectors: { size: this.VECTOR_SIZE, distance: 'Cosine' },
        });
        console.log('Documents collection created');
        try {
            await this.client.deleteCollection(this.CHAT_COLLECTION);
        }
        catch (e) { }
        await this.client.createCollection(this.CHAT_COLLECTION, {
            vectors: { size: this.VECTOR_SIZE, distance: 'Cosine' },
        });
        console.log('Chat history collection created');
    }
    async upsertPoints(collection, points) {
        return this.client.upsert(collection, { wait: true, points });
    }
    async search(collection, vector, limit = 5) {
        return this.client.search(collection, {
            vector,
            limit,
            with_payload: true,
        });
    }
    async scroll(collection, filter, limit = 1000) {
        return this.client.scroll(collection, {
            filter,
            limit,
        });
    }
    async deletePoints(collection, ids) {
        return this.client.delete(collection, { wait: true, points: ids });
    }
    getCollectionName() {
        return this.COLLECTION_NAME;
    }
    getChatCollectionName() {
        return this.CHAT_COLLECTION;
    }
};
exports.QdrantService = QdrantService;
exports.QdrantService = QdrantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], QdrantService);
//# sourceMappingURL=qdrant.service.js.map