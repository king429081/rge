import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { DocumentModule } from '../document/document.module';

@Module({
  imports: [DocumentModule],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
