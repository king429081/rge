import { DocumentService, Document } from './document.service';
export declare class DocumentController {
    private readonly documentService;
    constructor(documentService: DocumentService);
    uploadFile(file: Express.Multer.File): Promise<Document>;
    getDocuments(): Promise<Document[]>;
    deleteDocument(id: string): Promise<{
        success: boolean;
    }>;
}
