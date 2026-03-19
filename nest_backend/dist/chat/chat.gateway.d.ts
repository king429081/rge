import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'ws';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    server: Server;
    constructor(chatService: ChatService);
    handleConnection(client: any): void;
    handleDisconnect(client: any): void;
    handleChat(client: any, payload: {
        message: string;
        sessionId?: string;
    }): Promise<void>;
    handleGetHistory(client: any, payload: {
        sessionId?: string;
    }): Promise<void>;
    handleClearHistory(client: any, payload: {
        sessionId?: string;
    }): Promise<void>;
}
