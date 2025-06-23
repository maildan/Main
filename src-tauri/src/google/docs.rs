use reqwest::Client as HttpClient;
use crate::database::{Database, Document};
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
    }

    /// Google Drive에서 Google Docs 문서 목록 가져오기
    pub async fn fetch_documents(&self, access_token: &str) -> Result<Vec<GoogleDriveFile>, Box<dyn std::error::Error>> {
        let mut all_files = Vec::new();
        let mut page_token: Option<String> = None;

        loop {
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
            
            url = format!("{}?{}", url, query_string);

            let response = self
                .http_client
                .get(&url)
                .bearer_auth(access_token)
                .send()
                .await?;

            if !response.status().is_success() {
                return Err(format!("문서 목록 조회 실패: {}", response.status()).into());
            }

            let drive_response: GoogleDriveResponse = response.json().await?;
            all_files.extend(drive_response.files);

            page_token = drive_response.next_page_token;
            if page_token.is_none() {
                break;
            }
        }

        Ok(all_files)
    }

    /// 특정 Google Docs 문서 내용 가져오기
    pub async fn fetch_document_content(&self, access_token: &str, document_id: &str) -> Result<GoogleDocsContent, Box<dyn std::error::Error>> {
        let url = format!(
            "https://docs.googleapis.com/v1/documents/{}",
            document_id
        );

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("문서 내용 조회 실패: {}", response.status()).into());
        }

        let content: GoogleDocsContent = response.json().await?;
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
    }

    /// Google Drive 파일을 Document 모델로 변환
    pub fn convert_to_document(&self, file: &GoogleDriveFile, content: Option<&str>) -> Result<Document, Box<dyn std::error::Error>> {
        let created_time = DateTime::parse_from_rfc3339(&file.created_time)?
            .with_timezone(&Utc);
        let modified_time = DateTime::parse_from_rfc3339(&file.modified_time)?
            .with_timezone(&Utc);

        let (word_count, content_summary) = if let Some(text) = content {
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

        Ok(Document {
            id: file.id.clone(),
            title: file.name.clone(),
            google_created_time: created_time,
            google_modified_time: modified_time,
            last_synced: Utc::now(),
            word_count,
            content_summary,
        })
    }

    /// 문서 목록 동기화 (데이터베이스에 저장)
    pub async fn sync_documents(&self, access_token: &str, db: &Database) -> Result<Vec<Document>, Box<dyn std::error::Error>> {
        // 1. Google Drive에서 문서 목록 가져오기
        let drive_files = self.fetch_documents(access_token).await?;

        let mut documents = Vec::new();

        // 2. 각 문서를 데이터베이스에 저장
        for file in &drive_files {
            // 문서 내용 가져오기 (선택적 - 성능을 위해 필요한 경우만)
            let content = match self.fetch_document_content(access_token, &file.id).await {
                Ok(doc_content) => {
                    let text = self.extract_text_from_content(&doc_content);
                    Some(text)
                }
                Err(_) => None, // 에러 시 내용 없이 저장
            };

            // Document 모델로 변환
            let document = self.convert_to_document(file, content.as_deref())?;

            // 데이터베이스에 저장
            db.upsert_document(&document).await
                .map_err(|e| format!("문서 저장 실패: {}", e))?;

            documents.push(document);
        }

        Ok(documents)
    }

    /// 특정 문서의 상세 내용 동기화
    pub async fn sync_document_content(&self, access_token: &str, document_id: &str, db: &Database) -> Result<String, Box<dyn std::error::Error>> {
        // 1. 문서 내용 가져오기
        let doc_content = self.fetch_document_content(access_token, document_id).await?;
        let text = self.extract_text_from_content(&doc_content);

        // 2. 데이터베이스에서 기존 문서 정보 가져오기
        if let Some(mut document) = db.get_document_by_id(document_id).await? {
            // 3. 문서 정보 업데이트
            document.word_count = Some(self.count_words(&text));
            document.content_summary = Some(if text.len() > 200 {
                format!("{}...", &text[..200])
            } else {
                text.clone()
            });

            // 4. 데이터베이스에 업데이트
            db.upsert_document(&document).await
                .map_err(|e| format!("문서 업데이트 실패: {}", e))?;
        }

        Ok(text)
    }
}
