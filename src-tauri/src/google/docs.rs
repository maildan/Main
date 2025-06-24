use reqwest::Client as HttpClient;
use crate::database::{Database, Document, CreateDocumentRequest};
use chrono::{DateTime, Utc};

/// Google Docs API 관리 구조체
#[derive(Clone)]
pub struct GoogleDocsAPI {
    http_client: HttpClient,
}

/// Google Drive 파일 정보
#[derive(Debug, serde::Deserialize)]
pub struct GoogleDriveFile {
    pub id: String,
    pub name: String,
    #[serde(rename = "createdTime")]
    pub created_time: String,
    #[serde(rename = "modifiedTime")]
    pub modified_time: String,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
}

/// Google Drive API 응답
#[derive(Debug, serde::Deserialize)]
pub struct GoogleDriveResponse {
    pub files: Vec<GoogleDriveFile>,
    #[serde(rename = "nextPageToken")]
    pub next_page_token: Option<String>,
}

/// Google Docs 문서 내용
#[derive(Debug, serde::Deserialize)]
pub struct GoogleDocsContent {
    pub title: String,
    pub body: GoogleDocsBody,
    #[serde(rename = "documentId")]
    pub document_id: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct GoogleDocsBody {
    pub content: Vec<GoogleDocsElement>,
}

#[derive(Debug, serde::Deserialize)]
pub struct GoogleDocsElement {
    pub paragraph: Option<GoogleDocsParagraph>,
}

#[derive(Debug, serde::Deserialize)]
pub struct GoogleDocsParagraph {
    pub elements: Vec<GoogleDocsTextElement>,
}

#[derive(Debug, serde::Deserialize)]
pub struct GoogleDocsTextElement {
    #[serde(rename = "textRun")]
    pub text_run: Option<GoogleDocsTextRun>,
}

#[derive(Debug, serde::Deserialize)]
pub struct GoogleDocsTextRun {
    pub content: String,
}

impl GoogleDocsAPI {
    /// 새로운 GoogleDocsAPI 인스턴스 생성
    pub fn new() -> Self {
        Self {
            http_client: HttpClient::new(),
        }
    }    /// Google Drive에서 Google Docs 문서 목록 가져오기
    pub async fn fetch_documents(&self, access_token: &str) -> Result<Vec<GoogleDriveFile>, Box<dyn std::error::Error>> {
        // # debug: Google Drive API 호출 시작
        println!("Fetching Google Docs from Drive API");
        
        let mut all_files = Vec::new();
        let mut page_token: Option<String> = None;
        let mut page_count = 0;

        loop {
            page_count += 1;
            // # debug: API 페이지 호출
            println!("Fetching page {} of documents", page_count);
            
            let mut url = "https://www.googleapis.com/drive/v3/files".to_string();
            let mut query_params = vec![
                ("q", "mimeType='application/vnd.google-apps.document'"),
                ("fields", "files(id,name,createdTime,modifiedTime,mimeType),nextPageToken"),
                ("pageSize", "100"),
                ("orderBy", "modifiedTime desc"),
            ];

            if let Some(token) = &page_token {
                query_params.push(("pageToken", token));
            }

            // URL 쿼리 파라미터 구성
            let query_string = query_params
                .iter()
                .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
                .collect::<Vec<_>>()
                .join("&");
            
            url = format!("{}?{}", url, query_string);            let response = self
                .http_client
                .get(&url)
                .bearer_auth(access_token)
                .send()
                .await?;

            let status = response.status();
            if !status.is_success() {
                let error_body = response.text().await.unwrap_or_default();
                println!("API Error: Status {}, Body: {}", status, error_body);
                return Err(format!("문서 목록 조회 실패: {} - {}", status, error_body).into());
            }

            let drive_response: GoogleDriveResponse = response.json().await?;
            let files_count = drive_response.files.len();
            
            // # debug: 페이지 결과
            println!("Page {} returned {} documents", page_count, files_count);
            
            all_files.extend(drive_response.files);

            page_token = drive_response.next_page_token;
            if page_token.is_none() {
                break;
            }
        }

        // # debug: 전체 결과
        println!("Total {} documents fetched from Google Drive", all_files.len());

        Ok(all_files)
    }    /// 특정 Google Docs 문서 내용 가져오기
    pub async fn fetch_document_content(&self, access_token: &str, document_id: &str) -> Result<GoogleDocsContent, Box<dyn std::error::Error>> {
        // # debug: 문서 내용 조회 시작
        println!("Fetching content for document: {}", document_id);
        
        let url = format!(
            "https://docs.googleapis.com/v1/documents/{}",
            document_id
        );        let response = self
            .http_client
            .get(&url)
            .bearer_auth(access_token)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_default();
            println!("Document fetch error: Status {}, Body: {}", status, error_body);
            return Err(format!("문서 내용 조회 실패: {} - {}", status, error_body).into());
        }

        let content: GoogleDocsContent = response.json().await?;
        
        // # debug: 문서 내용 조회 완료
        println!("Document content fetched successfully: {}", content.title);
        
        Ok(content)
    }

    /// Google Docs 문서 내용을 텍스트로 변환
    pub fn extract_text_from_content(&self, content: &GoogleDocsContent) -> String {
        let mut text = String::new();

        for element in &content.body.content {
            if let Some(paragraph) = &element.paragraph {
                for text_element in &paragraph.elements {
                    if let Some(text_run) = &text_element.text_run {
                        text.push_str(&text_run.content);
                    }
                }
            }
        }

        text
    }

    /// 텍스트의 단어 수 계산 (간단한 구현)
    pub fn count_words(&self, text: &str) -> i32 {
        text.split_whitespace()
            .filter(|word| !word.is_empty())
            .count() as i32
    }

    /// Google Docs 문서에 텍스트 삽입
    pub async fn insert_text(&self, access_token: &str, document_id: &str, text: &str, position: Option<i32>) -> Result<(), Box<dyn std::error::Error>> {
        let url = format!(
            "https://docs.googleapis.com/v1/documents/{}:batchUpdate",
            document_id
        );

        let insert_position = position.unwrap_or(1); // 기본적으로 문서 시작 부분에 삽입

        let request_body = serde_json::json!({
            "requests": [
                {
                    "insertText": {
                        "location": {
                            "index": insert_position
                        },
                        "text": text
                    }
                }
            ]
        });        let response = self
            .http_client
            .post(&url)
            .bearer_auth(access_token)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("텍스트 삽입 실패: {} - {}", status, error_text).into());
        }

        Ok(())
    }    /// Google Drive 파일을 CreateDocumentRequest로 변환
    pub fn convert_to_document_request(&self, file: &GoogleDriveFile, content: Option<&str>, user_id: &str) -> Result<CreateDocumentRequest, Box<dyn std::error::Error>> {
        let created_time = DateTime::parse_from_rfc3339(&file.created_time)?
            .with_timezone(&Utc);
        let modified_time = DateTime::parse_from_rfc3339(&file.modified_time)?
            .with_timezone(&Utc);

        let (word_count, content) = if let Some(text) = content {
            let words = self.count_words(text);
            let summary = if text.len() > 200 {
                format!("{}...", &text[..200])
            } else {
                text.to_string()
            };
            (Some(words), Some(summary))
        } else {
            (None, None)
        };

        // CreateDocumentRequest 생성
        let doc_request = CreateDocumentRequest {
            google_doc_id: file.id.clone(),
            user_id: user_id.to_string(),
            title: file.name.clone(),
            content,
            word_count,
            created_time,
            modified_time,
        };

        Ok(doc_request)
    }

    /// 문서 목록 동기화 (데이터베이스에 저장)
    pub async fn sync_documents(&self, access_token: &str, user_id: &str, db: &Database) -> Result<Vec<Document>, Box<dyn std::error::Error>> {
        // 1. Google Drive에서 문서 목록 가져오기
        let drive_files = self.fetch_documents(access_token).await?;

        let mut documents = Vec::new();

        // 2. 각 문서를 데이터베이스에 저장
        for file in &drive_files {            // 문서 내용 가져오기 (선택적 - 성능을 위해 필요한 경우만)
            let content = match self.fetch_document_content(access_token, &file.id).await {
                Ok(doc_content) => {
                    let text = self.extract_text_from_content(&doc_content);
                    Some(text)
                }
                Err(_) => None, // 에러 시 내용 없이 저장
            };

            // CreateDocumentRequest 생성
            let doc_request = self.convert_to_document_request(file, content.as_deref(), user_id)?;

            // 데이터베이스에 저장
            let document = db.upsert_document(&doc_request).await
                .map_err(|e| format!("문서 저장 실패: {}", e))?;

            documents.push(document);
        }

        Ok(documents)
    }

    /// 특정 문서의 상세 내용 동기화
    pub async fn sync_document_content(&self, access_token: &str, document_id: &str, db: &Database) -> Result<String, Box<dyn std::error::Error>> {
        // 1. 문서 내용 가져오기
        let doc_content = self.fetch_document_content(access_token, document_id).await?;
        let text = self.extract_text_from_content(&doc_content);        // 2. 데이터베이스에서 기존 문서 정보 가져오기
        if let Some(document) = db.get_document_by_google_id(document_id).await? {
            // 3. 문서 정보 업데이트
            let word_count = Some(self.count_words(&text));
            let content = Some(if text.len() > 200 {
                format!("{}...", &text[..200])
            } else {
                text.clone()
            });

            // CreateDocumentRequest로 업데이트
            let update_request = CreateDocumentRequest {
                google_doc_id: document.google_doc_id.clone(),
                user_id: document.user_id.clone(),
                title: document.title.clone(),
                content,
                word_count,
                created_time: document.created_time,
                modified_time: document.modified_time,
            };

            // 4. 데이터베이스에 업데이트
            db.upsert_document(&update_request).await
                .map_err(|e| format!("문서 업데이트 실패: {}", e))?;
        }

        Ok(text)
    }

    /// 텍스트 요약 생성 (간단한 알고리즘)
    pub fn generate_summary(&self, text: &str) -> Result<(String, Vec<String>), Box<dyn std::error::Error>> {
        if text.trim().is_empty() {
            return Ok(("문서가 비어있습니다.".to_string(), vec![]));
        }

        // 1. 문장 분리
        let sentences: Vec<&str> = text
            .split('.')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty() && s.len() > 10)
            .collect();

        if sentences.is_empty() {
            return Ok(("요약할 내용이 없습니다.".to_string(), vec![]));
        }

        // 2. 키워드 추출 (간단한 빈도 기반)
        let keywords = self.extract_keywords(text);        // 3. 중요 문장 선택 (키워드를 많이 포함한 문장)
        let mut sentence_scores: Vec<(usize, &str)> = sentences
            .iter()
            .enumerate()
            .map(|(_, sentence)| {
                let score = keywords.iter()
                    .map(|keyword| sentence.to_lowercase().matches(&keyword.to_lowercase()).count())
                    .sum::<usize>();
                (score, *sentence)
            })
            .collect();

        // 점수 순으로 정렬
        sentence_scores.sort_by(|a, b| b.0.cmp(&a.0));

        // 상위 3개 문장으로 요약 생성
        let summary_sentences: Vec<&str> = sentence_scores
            .iter()
            .take(3)
            .map(|(_, sentence)| *sentence)
            .collect();

        let summary = if summary_sentences.is_empty() {
            "요약을 생성할 수 없습니다.".to_string()
        } else {
            summary_sentences.join(". ") + "."
        };

        Ok((summary, keywords))
    }

    /// 키워드 추출 (간단한 빈도 기반)
    fn extract_keywords(&self, text: &str) -> Vec<String> {
        use std::collections::HashMap;

        // 불용어 리스트 (간단한 예시)
        let stop_words = vec![
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
            "그", "그것", "이", "그리고", "또는", "하지만", "에서", "로", "의", "와", "과", "를", "을", "이", "가"
        ];

        // 단어별 빈도 계산
        let mut word_freq: HashMap<String, usize> = HashMap::new();
        
        for word in text.split_whitespace() {
            let clean_word = word
                .chars()
                .filter(|c| c.is_alphabetic() || c.is_numeric())
                .collect::<String>()
                .to_lowercase();

            if clean_word.len() > 2 && !stop_words.contains(&clean_word.as_str()) {
                *word_freq.entry(clean_word).or_insert(0) += 1;
            }
        }

        // 빈도순으로 정렬하여 상위 키워드 반환
        let mut keywords: Vec<(String, usize)> = word_freq.into_iter().collect();
        keywords.sort_by(|a, b| b.1.cmp(&a.1));

        keywords
            .into_iter()
            .take(5)
            .map(|(word, _)| word)
            .collect()
    }
}
