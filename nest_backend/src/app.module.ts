import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantModule } from './qdrant/qdrant.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { DocumentModule } from './document/document.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QdrantModule,
    EmbeddingModule,
    DocumentModule,
    ChatModule,
  ],
})
export class AppModule {}
