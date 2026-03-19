import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3001;

// ========== Chat History in Qdrant ==========
const CHAT_COLLECTION = 'chat_history';
let chatHistoryCounter = 1;

async function initChatCollection() {
	try {
		// Delete if exists to reset
		try {
			await qdrant.deleteCollection(CHAT_COLLECTION);
		} catch (e) {}

		await qdrant.createCollection(CHAT_COLLECTION, {
			vectors: { size: EMBEDDING_SIZE, distance: 'Cosine' },
		});
		console.log('Chat history collection created');
	} catch (error) {
		console.error('Error init chat collection:', error);
	}
}

async function addChatMessage(sessionId, role, content) {
	try {
		const result = await getEmbeddings([content]);
		const vector = result.embeddings[0];

		await qdrant.upsert(CHAT_COLLECTION, {
			wait: true,
			points: [{
				id: chatHistoryCounter++,
				vector: vector,
				payload: { sessionId, role, content, timestamp: Date.now() }
			}]
		});
	} catch (error) {
		console.error('Error adding chat message:', error);
	}
}

async function getChatHistory(sessionId, query, limit = 10) {
	try {
		// Get embedding for query
		const result = await getEmbeddings([query]);
		const queryVector = result.embeddings[0];

		// Search similar messages
		const searchResult = await qdrant.search(CHAT_COLLECTION, {
			vector: queryVector,
			limit: limit,
			with_payload: true,
			query_filter: {
				must: [{ key: 'sessionId', match: { value: sessionId } }]
			}
		});

		// Sort by timestamp and return
		const messages = searchResult
			.map(r => r.payload)
			.sort((a, b) => a.timestamp - b.timestamp);

		return messages;
	} catch (error) {
		console.error('Error getting chat history:', error);
		return [];
	}
}

async function clearChatHistory(sessionId) {
	try {
		const result = await qdrant.scroll(CHAT_COLLECTION, {
			scroll_filter: {
				must: [{ key: 'sessionId', match: { value: sessionId } }]
			},
			limit: 1000
		});

		if (result.result.length > 0) {
			await qdrant.delete(CHAT_COLLECTION, {
				wait: true,
				points: result.result.map(p => p.id)
			});
		}
	} catch (error) {
		console.error('Error clearing chat history:', error);
	}
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// WebSocket connection handling
wss.on('connection', (ws) => {
	console.log('Client connected');
	ws.isAlive = true;

	ws.on('pong', () => {
		ws.isAlive = true;
	});

	ws.on('message', async (message) => {
		try {
			const data = JSON.parse(message);

			if (data.type === 'chat') {
				const sessionId = data.sessionId || 'default';
				await handleChatStream(ws, data.message, sessionId);
			} else if (data.type === 'getHistory') {
				const sessionId = data.sessionId || 'default';
				const history = await getChatHistory(sessionId, '', 50);
				ws.send(JSON.stringify({ type: 'history', history }));
			} else if (data.type === 'clearHistory') {
				const sessionId = data.sessionId || 'default';
				await clearChatHistory(sessionId);
				clearHistory(sessionId);
				ws.send(JSON.stringify({ type: 'cleared' }));
			}
		} catch (error) {
			ws.send(JSON.stringify({ type: 'error', message: error.message }));
		}
	});

	ws.on('close', () => {
		console.log('Client disconnected');
	});
});

// Heartbeat to keep connections alive
const interval = setInterval(() => {
	wss.clients.forEach((ws) => {
		if (!ws.isAlive) return ws.terminate();
		ws.isAlive = false;
		ws.ping();
	});
}, 30000);

wss.on('close', () => clearInterval(interval));

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const uploadDir = path.join(__dirname, 'uploads');
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		cb(null, `${uuidv4()}-${file.originalname}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 50 * 1024 * 1024 },
});

// Qdrant client
const qdrant = new QdrantClient({
	url: 'http://localhost:6333',
});

// OpenAI client (MiniMax)
const openai = new OpenAI({
	apiKey: 'sk-cp-NMCZTmS0NNdeHAt0q1u5cIx6tTgdI8yvR7XjvSrWVqjBeFFz0i879cIsyIyTUCheBPb7hD6zwpQSgwrdDzPChALLZOMnt3KVXS_8b2y2ZiR5LxE5aZo2wCY',
	baseURL: 'https://api.minimax.chat/v1',
});

// Handle streaming chat
async function handleChatStream(ws, message, sessionId = 'default') {
	try {
		// Get chat history from vector DB (semantic search)
		const history = await getChatHistory(sessionId, message, 10);

		// Get query embedding for document search
		const embeddingResult = await getEmbeddings([message]);
		const queryVector = embeddingResult.embeddings[0];

		// Search Qdrant for RAG context (documents)
		const searchResult = await qdrant.search(COLLECTION_NAME, {
			vector: queryVector,
			limit: 5,
			with_payload: true,
		});

		let sources = [];
		let docContext = '';

		if (searchResult.length > 0) {
			docContext = searchResult.map((r) => r.payload.chunk).join('\n\n');
			sources = [...new Set(searchResult.map((r) => r.payload.filename))];
		}

		// Build system prompt
		let systemPrompt = 'You are a helpful AI assistant.';
		if (searchResult.length > 0) {
			systemPrompt = 'You are a helpful assistant. Answer based on the conversation history and provided documents. Cite sources when possible.';
		}

		// Build messages with history and context
		const messages = [{ role: 'system', content: systemPrompt }];

		// Add history from vector search
		history.forEach(msg => {
			messages.push({ role: msg.role, content: msg.content });
		});

		// Add current question with document context
		let userContent = message;
		if (docContext) {
			userContent = `Related documents:\n${docContext}\n\nQuestion: ${message}`;
		}
		messages.push({ role: 'user', content: userContent });

		// Stream response from MiniMax
		const stream = await openai.chat.completions.create({
			model: 'MiniMax-Text-01',
			messages: messages,
			stream: true,
		});

		let fullResponse = '';

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content || '';
			if (content) {
				fullResponse += content;
				ws.send(JSON.stringify({
					type: 'chunk',
					content: content,
				}));
			}
		}

		// Send completion
		ws.send(JSON.stringify({
			type: 'done',
			sources: sources,
		}));

		// Save to vector database
		await addChatMessage(sessionId, 'user', message);
		await addChatMessage(sessionId, 'assistant', fullResponse);

	} catch (error) {
		console.error('Chat error:', error);
		ws.send(JSON.stringify({
			type: 'error',
			message: error.message,
		}));
	}
}

// In-memory document store
const documents = new Map();
const COLLECTION_NAME = 'rag_documents';
const EMBEDDING_SIZE = 384;

// Initialize Qdrant collection
async function initCollection() {
	try {
		// Delete old collection if exists (to reset vector size)
		try {
			await qdrant.deleteCollection(COLLECTION_NAME);
			console.log('Old collection deleted');
		} catch (e) {
			// Collection might not exist
		}

		// Create new collection
		await qdrant.createCollection(COLLECTION_NAME, {
			vectors: { size: EMBEDDING_SIZE, distance: 'Cosine' },
		});
		console.log('Collection created');
	} catch (error) {
		console.error('Error initializing collection:', error);
	}
}

// Extract text from files
async function extractText(filePath) {
	const ext = path.extname(filePath).toLowerCase();

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

// Get embeddings
async function getEmbeddings(texts) {
	const response = await fetch('http://localhost:5001/embed', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ texts }),
	});
	if (!response.ok) throw new Error(`Embedding error: ${response.statusText}`);
	return response.json();
}

// Simple chunk function
function chunkText(text, chunkSize = 500) {
	if (!text || text.length === 0) return [];
	const chunks = [];
	for (let i = 0; i < text.length; i += chunkSize - 50) {
		chunks.push(text.slice(i, i + chunkSize));
	}
	return chunks;
}

// Upload endpoint - simplified
app.post('/api/upload', upload.single('file'), async (req, res) => {
	try {
		console.log('\n========== 文件上传开始 ==========');

		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const { path: filePath, originalname, size } = req.file;
		console.log(`📄 文件: ${originalname}, 大小: ${(size / 1024).toFixed(2)} KB`);

		// Extract text
		console.log('🔄 提取文本...');
		let { text, pageCount } = await extractText(filePath);
		console.log(`✅ 文本长度: ${text.length} 字符, 页数: ${pageCount}`);

		// Chunk
		console.log('🔄 分块...');
		const chunks = chunkText(text);
		console.log(`✅ 分块完成: ${chunks.length} 个块`);

		// Clear text
		text = null;

		// Process chunks one by one
		const docId = uuidv4();
		console.log('🔄 生成向量并存储...');

		for (let i = 0; i < chunks.length; i++) {
			const result = await getEmbeddings([chunks[i]]);

			await qdrant.upsert(COLLECTION_NAME, {
				wait: true,
				points: [{
					id: i + 1,
					vector: result.embeddings[0],
					payload: { docId, filename: originalname, chunk: chunks[i], chunkIndex: i },
				}],
			});

			console.log(`   ✅ ${i + 1}/${chunks.length}`);
		}

		// Save metadata
		documents.set(docId, {
			id: docId,
			filename: originalname,
			uploadDate: new Date().toISOString(),
			chunkCount: chunks.length,
		});

		// Cleanup
		fs.unlinkSync(filePath);
		chunks.length = 0;

		console.log('========== 上传完成 ==========\n');

		res.json({ id: docId, filename: originalname, chunkCount: chunks.length });
	} catch (error) {
		console.error('❌ 错误:', error);
		res.status(500).json({ error: error.message });
	}
});

// Get all documents
app.get('/api/documents', (req, res) => {
	res.json(Array.from(documents.values()));
});

// Delete document
app.delete('/api/documents/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const searchResult = await qdrant.scroll(COLLECTION_NAME, {
			scroll_filter: { must: [{ key: 'docId', match: { value: id } }] },
			limit: 1000,
		});
		if (searchResult.result.length > 0) {
			await qdrant.delete(COLLECTION_NAME, {
				wait: true,
				points: searchResult.result.map((p) => p.id),
			});
		}
		documents.delete(id);
		res.json({ success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
	try {
		const { message } = req.body;
		if (!message) return res.status(400).json({ error: 'Message is required' });

		const embeddingResult = await getEmbeddings([message]);
		const queryVector = embeddingResult.embeddings[0];

		const searchResult = await qdrant.search(COLLECTION_NAME, {
			vector: queryVector,
			limit: 5,
			with_payload: true,
		});

		let response;
		let sources = [];

		if (searchResult.length === 0) {
			const completion = await openai.chat.completions.create({
				model: 'MiniMax-Text-01',
				messages: [
					{ role: 'system', content: 'You are a helpful AI assistant.' },
					{ role: 'user', content: message },
				],
			});
			response = completion.choices[0].message.content;
		} else {
			const context = searchResult.map((r) => r.payload.chunk).join('\n\n');
			sources = [...new Set(searchResult.map((r) => r.payload.filename))];

			const completion = await openai.chat.completions.create({
				model: 'MiniMax-Text-01',
				messages: [
					{ role: 'system', content: 'Answer based on the context. Cite sources when possible.' },
					{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${message}` },
				],
			});
			response = completion.choices[0].message.content;
		}

		res.json({ response, sources });
	} catch (error) {
		console.error('Chat error:', error);
		res.status(500).json({ error: error.message });
	}
});

// Start server
server.listen(PORT, async () => {
	await initChatCollection();
	await initCollection();
	console.log(`Backend running on http://localhost:${PORT}`);
});
