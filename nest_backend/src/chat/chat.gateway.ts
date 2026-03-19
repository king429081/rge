import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { ChatService } from './chat.service';

@WebSocketGateway({ path: '/ws' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: any) {
    console.log('Client connected');
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected');
  }

  @SubscribeMessage('chat')
  async handleChat(client: any, payload: { message: string; sessionId?: string }) {
    const sessionId = payload.sessionId || 'default';

    try {
      for await (const chunk of this.chatService.streamChat(sessionId, payload.message)) {
        client.send(JSON.stringify(chunk));
      }
    } catch (error) {
      console.error('Chat error:', error);
      client.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(client: any, payload: { sessionId?: string }) {
    client.send(JSON.stringify({ type: 'history', history: [] }));
  }

  @SubscribeMessage('clearHistory')
  async handleClearHistory(client: any, payload: { sessionId?: string }) {
    client.send(JSON.stringify({ type: 'cleared' }));
  }
}
