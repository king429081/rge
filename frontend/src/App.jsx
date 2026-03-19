import { useState, useRef, useEffect } from 'react'

function App() {
  const [documents, setDocuments] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    fetchDocuments()
    initWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initWebSocket = () => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'chunk') {
        // Append streaming chunk to last message
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + data.content
            }
          }
          return updated
        })
      } else if (data.type === 'done') {
        // Stream complete
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              sources: data.sources || []
            }
          }
          return updated
        })
        setIsLoading(false)
      } else if (data.type === 'error') {
        console.error('WebSocket error:', data.message)
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: 'Sorry, something went wrong.',
              sources: []
            }
          }
          return updated
        })
        setIsLoading(false)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    wsRef.current = ws
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocuments(data)
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    const allowedTypes = ['.txt', '.pdf', '.docx']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowedTypes.includes(ext)) {
      alert('Please upload a .txt, .pdf, or .docx file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Upload failed')

      setUploadProgress(100)
      setUploadSuccess(true)
      fetchDocuments()

      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload file')
      setIsUploading(false)
    }
  }

  const handleDeleteDocument = async (id) => {
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      fetchDocuments()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }])

    // Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message: userMessage
      }))
    } else {
      // Fallback: reconnect and retry
      initWebSocket()
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'chat',
            message: userMessage
          }))
        }
      }, 1000)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    if (ext === 'pdf') return '📄'
    if (ext === 'docx' || ext === 'doc') return '📝'
    return '📃'
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🤖 RAG <span>Knowledge Base</span></h1>
      </header>

      <main className="main-content">
        <aside className="sidebar">
          <div className="upload-section">
            <h2>📤 Upload Documents</h2>
            <div
              className={`dropzone ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="dropzone-icon">📁</div>
              <p>Drop files here or click to upload</p>
              <small>Supports: TXT, PDF, DOCX (max 10MB)</small>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files[0])}
              accept=".txt,.pdf,.docx"
              style={{ display: 'none' }}
            />
            {isUploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            {uploadSuccess && <p className="upload-success">✓ Uploaded successfully!</p>}
          </div>

          <div className="document-list">
            <h2>📚 Documents ({documents.length})</h2>
            {documents.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>No documents uploaded yet</p>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="document-item">
                  <div className="document-info">
                    <span className="document-icon">{getFileIcon(doc.filename)}</span>
                    <div>
                      <div className="document-name">{doc.filename}</div>
                      <div className="document-meta">
                        {new Date(doc.uploadDate).toLocaleDateString()} • {doc.chunkCount} chunks
                      </div>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="chat-container">
          <div className="chat-header">
            <h2>💬 Chat with your Knowledge Base</h2>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💭</div>
                <h3>Start a conversation</h3>
                <p>Upload documents and ask questions about them</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  {msg.content}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="sources">
                      Sources: <span>{msg.sources.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <textarea
              className="chat-input"
              placeholder="Ask a question about your documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
            >
              Send
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
