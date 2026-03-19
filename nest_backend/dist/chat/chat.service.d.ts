import { DocumentService } from '../document/document.service';
export declare class ChatService {
    private readonly documentService;
    private openai;
    constructor(documentService: DocumentService);
    streamChat(sessionId: string, message: string): AsyncGenerator<{
        type: string;
        content: string;
        sources?: undefined;
    } | {
        type: string;
        sources: unknown[];
        content?: undefined;
    }, void, unknown>;
}
