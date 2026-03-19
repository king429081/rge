# RAG AI Knowledge Base - Specification

## 1. Project Overview

- **Project Name**: RAG Knowledge Base
- **Type**: Full-stack Web Application
- **Core Functionality**: AI-powered knowledge base with document upload, vector storage, and intelligent Q&A
- **Target Users**: Teams/individuals who need to query their documents using AI

## 2. Technology Stack

- **Backend**: Express.js (Node.js)
- **Vectorization**: Python Flask + MiniMax Embedding API (embo-01)
- **Vector Database**: Qdrant (localhost:6333)
- **Frontend**: React + Vite
- **AI Model**: MiniMax2.5 (via OpenAI-compatible API)
- **API Key**: sk-cp-NMCZTmS0NNdeHAt0q1u5cIx6tTgdI8yvR7XjvSrWVqjBeFFz0i879cIsyIyTUCheBPb7hD6zwpQSgwrdDzPChALLZOMnt3KVXS_8b2y2ZiR5LxE5aZo2wCY

## 3. Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│  Express    │────▶│   Qdrant    │
│   Frontend  │     │   Backend   │     │  (Vectors)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Python    │
                   │   Flask     │
                   │ (port 5001) │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   MiniMax   │
                   │   API       │
                   │ (Embedding) │
                   └─────────────┘
```

## 4. Running the Application

### Services:
| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend | 3001 | http://localhost:3001 |
| Python Vectorizer | 5001 | http://localhost:5001 |
| Qdrant | 6333 | http://localhost:6333 |

### Start commands:
```bash
# Qdrant (must be running)
docker run -p 6333:6333 qdrant/qdrant

# Python vectorization service
cd python_vectorizer
python3 app.py

# Backend
cd backend
NODE_OPTIONS="--max-old-space-size=4096" node index.js

# Frontend
cd frontend
npm run dev
```

## 5. Acceptance Criteria

- [x] File upload works for txt, pdf, docx
- [x] Documents are chunked and embedded via Python + MiniMax API
- [x] Embeddings stored in Qdrant
- [x] Chat returns relevant answers with sources
- [x] UI is responsive and functional
- [x] MiniMax API integration works
