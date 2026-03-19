import { QdrantService } from '../qdrant/qdrant.service';
import { EmbeddingService } from '../embedding/embedding.service';
export interface Document {
    id: string;
    filename: string;
    uploadDate: string;
    chunkCount: number;
}
export declare class DocumentService {
    private readonly qdrantService;
    private readonly embeddingService;
    private documents;
    private chatHistoryCounter;
    constructor(qdrantService: QdrantService, embeddingService: EmbeddingService);
    uploadFile(file: Express.Multer.File): Promise<Document>;
    getDocuments(): Promise<Document[]>;
    deleteDocument(id: string): Promise<{
        success: boolean;
    }>;
    addChatMessage(sessionId: string, role: string, content: string): Promise<void>;
    getChatHistory(sessionId: string, query: string, limit?: number): Promise<any>;
    searchDocuments(query: string): Promise<any>;
    private extractText;
    private chunkText;
}
