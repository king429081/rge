import { OnModuleInit } from '@nestjs/common';
export declare class QdrantService implements OnModuleInit {
    private client;
    private readonly COLLECTION_NAME;
    private readonly CHAT_COLLECTION;
    private readonly VECTOR_SIZE;
    constructor();
    onModuleInit(): Promise<void>;
    private initCollections;
    upsertPoints(collection: string, points: any[]): Promise<any>;
    search(collection: string, vector: number[], limit?: number): Promise<any>;
    scroll(collection: string, filter?: any, limit?: number): Promise<any>;
    deletePoints(collection: string, ids: number[]): Promise<any>;
    getCollectionName(): string;
    getChatCollectionName(): string;
}
