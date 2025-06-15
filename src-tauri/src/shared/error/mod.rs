use std::fmt;

#[derive(Debug)]
#[allow(dead_code)]
pub enum KakaoError {
    IoError(std::io::Error),
    SqliteError(rusqlite::Error),
    DecryptionError(String),
    ParseError(String),
    FileNotFound(String),
}

impl fmt::Display for KakaoError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            KakaoError::IoError(e) => write!(f, "IO Error: {}", e),
            KakaoError::SqliteError(e) => write!(f, "SQLite Error: {}", e),
            KakaoError::DecryptionError(e) => write!(f, "Decryption Error: {}", e),
            KakaoError::ParseError(e) => write!(f, "Parse Error: {}", e),
            KakaoError::FileNotFound(e) => write!(f, "File Not Found: {}", e),
        }
    }
}

impl std::error::Error for KakaoError {}

impl From<std::io::Error> for KakaoError {
    fn from(error: std::io::Error) -> Self {
        KakaoError::IoError(error)
    }
}

impl From<rusqlite::Error> for KakaoError {
    fn from(error: rusqlite::Error) -> Self {
        KakaoError::SqliteError(error)
    }
}