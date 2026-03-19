import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001/embed';

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.PYTHON_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.embeddings;
  }
}
