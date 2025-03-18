import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();


// 연결 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'typing_stats', // 데이터베이스 이름 지정
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 테이블 생성을 위한 초기화 함수
export async function initializeDatabase() {
  try {
    // TypingLog 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS typing_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        key_count INT NOT NULL,
        typing_time INT NOT NULL,
        timestamp DATETIME NOT NULL,
        window_title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.error('데이터베이스 초기화 완료');
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
  }
}

// DB 연결 풀 내보내기
export default pool;