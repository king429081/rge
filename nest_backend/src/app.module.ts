import { Module } from '@nestjs/common';
import { QdrantModule } from './qdrant/qdrant.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { DocumentModule } from './document/document.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    QdrantModule,
    EmbeddingModule,
    DocumentModule,
    ChatModule,
  ],
})
export class AppModule {}
