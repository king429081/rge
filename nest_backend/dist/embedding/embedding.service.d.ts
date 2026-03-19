export declare class EmbeddingService {
    private readonly PYTHON_SERVICE_URL;
    getEmbeddings(texts: string[]): Promise<number[][]>;
}
