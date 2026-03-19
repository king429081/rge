import { Injectable } from '@nestjs/common';
import { QdrantService } from '../qdrant/qdrant.service';
import { EmbeddingService } from '../embedding/embedding.service';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

export interface Document {
  id: string;
  filename: string;
  uploadDate: string;
  chunkCount: number;
}

@Injectable()
export class DocumentService {
  private documents = new Map<string, Document>();
  private chatHistoryCounter = 1;

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async uploadFile(file: Express.Multer.File) {
    const docId = uuidv4();
    const { originalname, path: filePath } = file;

    console.log(`\n========== 文件上传开始 ==========`);
    console.log(`📄 文件: ${originalname}`);

    // Extract text
    console.log('🔄 步骤1: 提取文本...');
    const { text, pageCount } = await this.extractText(filePath, originalname);
    console.log(`✅ 文本长度: ${text.length} 字符, 页数: ${pageCount}`);

    // Chunk
    console.log('🔄 步骤2: 分块...');
    const chunks = this.chunkText(text);
    console.log(`✅ 分块完成: ${chunks.length} 个块`);

    // Generate embeddings and store
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

    // Save metadata
    const doc: Document = {
      id: docId,
      filename: originalname,
      uploadDate: new Date().toISOString(),
      chunkCount: chunks.length,
    };
    this.documents.set(docId, doc);

    // Cleanup
    fs.unlinkSync(filePath);
    console.log('========== 上传完成 ==========\n');

    return doc;
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async deleteDocument(id: string) {
    const doc = this.documents.get(id);
    if (!doc) return { success: false };

    // Delete from Qdrant
    const result: any = await this.qdrantService.scroll(
      this.qdrantService.getCollectionName(),
      { must: [{ key: 'docId', match: { value: id } }] },
      1000,
    );

    if (result.result && result.result.length > 0) {
      await this.qdrantService.deletePoints(
        this.qdrantService.getCollectionName(),
        result.result.map((p: any) => p.id),
      );
    }

    this.documents.delete(id);
    return { success: true };
  }

  // Chat history operations
  async addChatMessage(sessionId: string, role: string, content: string) {
    const result = await this.embeddingService.getEmbeddings([content]);

    await this.qdrantService.upsertPoints(this.qdrantService.getChatCollectionName(), [{
      id: this.chatHistoryCounter++,
      vector: result[0],
      payload: { sessionId, role, content, timestamp: Date.now() },
    }]);
  }

  async getChatHistory(sessionId: string, query: string, limit = 10) {
    if (!query) {
      // Return all messages if no query
      const result: any = await this.qdrantService.scroll(
        this.qdrantService.getChatCollectionName(),
        { must: [{ key: 'sessionId', match: { value: sessionId } }] },
        100,
      );
      return (result.result || [])
        .map((p: any) => p.payload)
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
    }

    const result = await this.embeddingService.getEmbeddings([query]);
    const searchResult = await this.qdrantService.search(
      this.qdrantService.getChatCollectionName(),
      result[0],
      limit,
    );

    return searchResult
      .filter((r: any) => r.payload.sessionId === sessionId)
      .map((r: any) => r.payload)
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
  }

  async searchDocuments(query: string) {
    const result = await this.embeddingService.getEmbeddings([query]);
    return this.qdrantService.search(
      this.qdrantService.getCollectionName(),
      result[0],
      5,
    );
  }

  private async extractText(filePath: string, filename: string) {
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

  private chunkText(text: string, chunkSize = 500) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - 50) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
