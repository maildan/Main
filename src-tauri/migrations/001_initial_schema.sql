-- Initial schema for Loop application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    picture_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    google_doc_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    word_count INTEGER,
    created_time DATETIME NOT NULL,
    modified_time DATETIME NOT NULL,
    last_synced_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Document summaries table
CREATE TABLE IF NOT EXISTS document_summaries (
    id TEXT PRIMARY KEY,
    document_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    keywords TEXT,
    generated_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Edit history table
CREATE TABLE IF NOT EXISTS edit_history (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'view', 'edit', 'summarize', etc.
    content_before TEXT,
    content_after TEXT,
    metadata TEXT, -- JSON string for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_google_doc_id ON documents(google_doc_id);
CREATE INDEX IF NOT EXISTS idx_documents_modified_time ON documents(modified_time);
CREATE INDEX IF NOT EXISTS idx_document_summaries_document_id ON document_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_document_id ON edit_history(document_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_user_id ON edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_created_at ON edit_history(created_at);
