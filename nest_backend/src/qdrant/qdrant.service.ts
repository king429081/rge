import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: any;
  private readonly COLLECTION_NAME = 'rag_documents';
  private readonly CHAT_COLLECTION = 'chat_history';
  private readonly VECTOR_SIZE = 384;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  async onModuleInit() {
    await this.initCollections();
  }

  private async initCollections() {
    // Create documents collection
    try {
      await this.client.deleteCollection(this.COLLECTION_NAME);
    } catch (e) {}

    await this.client.createCollection(this.COLLECTION_NAME, {
      vectors: { size: this.VECTOR_SIZE, distance: 'Cosine' },
    });
    console.log('Documents collection created');

    // Create chat history collection
    try {
      await this.client.deleteCollection(this.CHAT_COLLECTION);
    } catch (e) {}

    await this.client.createCollection(this.CHAT_COLLECTION, {
      vectors: { size: this.VECTOR_SIZE, distance: 'Cosine' },
    });
    console.log('Chat history collection created');
  }

  // Documents operations
  async upsertPoints(collection: string, points: any[]) {
    return this.client.upsert(collection, { wait: true, points });
  }

  async search(collection: string, vector: number[], limit = 5) {
    return this.client.search(collection, {
      vector,
      limit,
      with_payload: true,
    });
  }

  async scroll(collection: string, filter?: any, limit = 1000) {
    return this.client.scroll(collection, {
      filter,
      limit,
    });
  }

  async deletePoints(collection: string, ids: number[]) {
    return this.client.delete(collection, { wait: true, points: ids });
  }

  getCollectionName() {
    return this.COLLECTION_NAME;
  }

  getChatCollectionName() {
    return this.CHAT_COLLECTION;
  }
}
