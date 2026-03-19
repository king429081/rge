import { Injectable } from '@nestjs/common';
import { DocumentService } from '../document/document.service';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(private readonly documentService: DocumentService) {
    this.openai = new OpenAI({
      apiKey: 'sk-cp-NMCZTmS0NNdeHAt0q1u5cIx6tTgdI8yvR7XjvSrWVqjBeFFz0i879cIsyIyTUCheBPb7hD6zwpQSgwrdDzPChALLZOMnt3KVXS_8b2y2ZiR5LxE5aZo2wCY',
      baseURL: 'https://api.minimax.chat/v1',
    });
  }

  async *streamChat(sessionId: string, message: string) {
    // Get chat history from vector DB
    const history = await this.documentService.getChatHistory(sessionId, message, 10);

    // Search documents
    const docResults = await this.documentService.searchDocuments(message);

    const sources = docResults.length > 0
      ? [...new Set(docResults.map((r: any) => r.payload.filename))]
      : [];

    const docContext = docResults.length > 0
      ? docResults.map((r: any) => r.payload.chunk).join('\n\n')
      : '';

    // Build messages
    const messages: any[] = [{
      role: 'system',
      content: docResults.length > 0
        ? '你是helpful助手。基于对话历史和提供的文档回答，并注明来源。'
        : '你是helpful助手。',
    }];

    // Add history
    history.forEach((msg: any) => {
      messages.push({ role: msg.role, content: msg.content });
    });

    // Add current question with context
    const userContent = docContext
      ? `相关文档:\n${docContext}\n\n问题: ${message}`
      : message;
    messages.push({ role: 'user', content: userContent });

    // Stream from MiniMax
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

    // Save to history
    await this.documentService.addChatMessage(sessionId, 'user', message);
    await this.documentService.addChatMessage(sessionId, 'assistant', fullResponse);

    yield { type: 'done', sources };
  }
}
