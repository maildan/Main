use oauth2::{
    AuthUrl, ClientId, ClientSecret, CsrfToken,
    RedirectUrl, Scope, TokenUrl, AuthorizationCode, TokenResponse,
};
use oauth2::basic::BasicClient;
use reqwest::Client as HttpClient;
use serde_json::Value;
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};
use crate::database::{Database, GoogleOAuthResponse, GoogleUserInfo, CreateUserRequest};
use crate::config::GoogleConfig;
use chrono::{Utc, Duration};
use std::collections::HashMap;
use once_cell::sync::Lazy;
use std::sync::Mutex as StdMutex;
use futures::future::{AbortHandle, Abortable};

/// Google OAuth API 엔드포인트
const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://www.googleapis.com/oauth2/v4/token";
const GOOGLE_USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";

/// 글로벌 AbortHandle
static OAUTH_ABORT_HANDLE: Lazy<StdMutex<Option<AbortHandle>>> = Lazy::new(|| StdMutex::new(None));

/// Google OAuth 관리 구조체
pub struct GoogleOAuth {
    client: BasicClient,
    http_client: HttpClient,
    config: GoogleConfig,
    callback_data: std::sync::Arc<std::sync::Mutex<Option<String>>>,
}

impl Clone for GoogleOAuth {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            http_client: self.http_client.clone(),
            config: self.config.clone(),
            callback_data: self.callback_data.clone(),
        }
    }
}

impl GoogleOAuth {
    /// 새로운 GoogleOAuth 인스턴스 생성
    pub fn new() -> Result<Self, String> {
        // # debug: GoogleOAuth 초기화 시작        
        println!("✓ Google OAuth ready");
        
        let config = GoogleConfig::from_env()
            .map_err(|e| format!("Google OAuth 설정 로드 실패: {}", e))?;

        // 디버깅: 설정값 출력 (민감정보 제외)
        println!("OAuth 설정:");
        println!("  - Client ID: {}...", &config.client_id[..20]);
        println!("  - Redirect URL: {}", config.redirect_url);

        let client = BasicClient::new(
            ClientId::new(config.client_id.clone()),
            Some(ClientSecret::new(config.client_secret.clone())),
            AuthUrl::new(GOOGLE_AUTH_URL.to_string())
                .map_err(|e| format!("Auth URL 생성 실패: {}", e))?,
            Some(TokenUrl::new(GOOGLE_TOKEN_URL.to_string())
                .map_err(|e| format!("Token URL 생성 실패: {}", e))?),
        )
        .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone())
            .map_err(|e| format!("Redirect URL 생성 실패: {}", e))?);

        let http_client = HttpClient::new();

        Ok(Self {
            client,
            http_client,
            config,
            callback_data: std::sync::Arc::new(std::sync::Mutex::new(None)),
        })
    }    /// OAuth 인증 URL 생성
    pub fn get_auth_url(&self) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        // OAuth 인증 URL 생성
        let (auth_url, _csrf_token) = self
            .client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .add_scope(Scope::new("https://www.googleapis.com/auth/documents".to_string()))
            .add_scope(Scope::new("https://www.googleapis.com/auth/drive.metadata.readonly".to_string()))
            // 오프라인 액세스 및 동의 화면 표시 (refresh token 발급)
            .add_extra_param("access_type", "offline")
            .add_extra_param("prompt", "consent")
            .url();

        println!("Generated OAuth URL: {}", auth_url);
        Ok(auth_url.to_string())
    }

    /// Authorization Code를 Access Token으로 교환
    pub async fn exchange_code(&self, code: &str) -> Result<GoogleOAuthResponse, Box<dyn std::error::Error + Send + Sync>> {
        let token_result = self
            .client
            .exchange_code(AuthorizationCode::new(code.to_string()))
            .request_async(oauth2::reqwest::async_http_client)
            .await?;

        let response = GoogleOAuthResponse {
            access_token: token_result.access_token().secret().clone(),
            refresh_token: token_result.refresh_token().map(|t| t.secret().clone()),
            expires_in: token_result.expires_in().map(|d| d.as_secs() as i64).unwrap_or(3600),
            scope: token_result.scopes().map(|scopes| {
                scopes.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(" ")
            }).unwrap_or_default(),
            token_type: "Bearer".to_string(),
            id_token: None, // ID Token은 별도 파싱 필요
        };

        Ok(response)
    }

    /// Access Token으로 사용자 정보 가져오기
    pub async fn get_user_info(&self, access_token: &str) -> Result<GoogleUserInfo, Box<dyn std::error::Error + Send + Sync>> {
        let response = self
            .http_client
            .get(GOOGLE_USERINFO_URL)
            .bearer_auth(access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("사용자 정보 조회 실패: {}", response.status()).into());
        }

        let user_info: GoogleUserInfo = response.json().await?;
        Ok(user_info)
    }    /// Refresh Token으로 Access Token 갱신
    pub async fn refresh_access_token(&self, refresh_token: &str) -> Result<GoogleOAuthResponse, Box<dyn std::error::Error + Send + Sync>> {
        let mut params = HashMap::new();
        params.insert("client_id", self.config.client_id.as_str());
        params.insert("client_secret", self.config.client_secret.as_str());
        params.insert("refresh_token", refresh_token);
        params.insert("grant_type", "refresh_token");

        let response = self
            .http_client
            .post(GOOGLE_TOKEN_URL)
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("토큰 갱신 실패: {}", response.status()).into());
        }

        let token_data: Value = response.json().await?;

        let response = GoogleOAuthResponse {
            access_token: token_data["access_token"].as_str()
                .ok_or("access_token이 없습니다")?.to_string(),
            refresh_token: Some(refresh_token.to_string()), // 기존 refresh_token 유지
            expires_in: token_data["expires_in"].as_i64().unwrap_or(3600),
            scope: token_data["scope"].as_str().unwrap_or("").to_string(),
            token_type: token_data["token_type"].as_str().unwrap_or("Bearer").to_string(),
            id_token: token_data["id_token"].as_str().map(|s| s.to_string()),
        };

        Ok(response)
    }/// 사용자 인증 및 데이터베이스 저장
    pub async fn authenticate_user(&self, code: &str, db: &Database) -> Result<crate::database::User, Box<dyn std::error::Error + Send + Sync>> {
        // 1. Authorization Code를 Access Token으로 교환
        let token_response = self.exchange_code(code).await?;

        // 2. Access Token으로 사용자 정보 가져오기
        let user_info = self.get_user_info(&token_response.access_token).await?;        // 3. 토큰 만료 시간 계산
        let expires_at = Utc::now() + Duration::seconds(token_response.expires_in);

        // 4. 데이터베이스에 사용자 정보 저장
        let create_request = CreateUserRequest {
            google_id: user_info.id,
            email: user_info.email,
            name: user_info.name,
            picture_url: user_info.picture,
            access_token: Some(token_response.access_token),
            refresh_token: token_response.refresh_token,
            token_expires_at: expires_at,
        };

        let user = db.upsert_user(&create_request).await
            .map_err(|e| format!("사용자 저장 실패: {}", e))?;

        Ok(user)
    }

    /// 토큰 유효성 검사 및 자동 갱신
    pub async fn ensure_valid_token(&self, user: &mut crate::database::User, db: &Database) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // 토큰이 5분 이내에 만료되면 갱신
        let now = Utc::now();
        let expires_soon = user.token_expires_at - Duration::minutes(15);        if now >= expires_soon {
            // refresh_token이 있는지 확인
            let refresh_token = user.refresh_token.as_ref()
                .ok_or("refresh_token이 없습니다")?;
            
            // 토큰 갱신
            let token_response = self.refresh_access_token(refresh_token).await?;            // 새로운 만료 시간 계산
            let new_expires_at = Utc::now() + Duration::seconds(token_response.expires_in);

            // 데이터베이스 업데이트
            let update_request = crate::database::UpdateTokenRequest {
                access_token: token_response.access_token.clone(),
                refresh_token: token_response.refresh_token.clone(),
                token_expires_at: new_expires_at,
            };

            db.update_user_tokens(&user.id, &update_request).await
                .map_err(|e| format!("토큰 업데이트 실패: {}", e))?;

            // 메모리의 사용자 정보도 업데이트
            user.access_token = Some(token_response.access_token);
            if let Some(new_refresh_token) = token_response.refresh_token {
                user.refresh_token = Some(new_refresh_token);
            }
            user.token_expires_at = new_expires_at;
        }

        Ok(())
    }

    /// 자동화된 OAuth 로그인 (로컬 서버 사용)
    pub async fn login_with_webview(&self, app_handle: &AppHandle) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        use tokio::net::TcpListener;
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        use tauri::Emitter;
        
        // OAuth URL 생성
        let auth_url = self.get_auth_url()?;
        
        // 로컬 콜백 서버 시작 (포트 8080)
        let listener = TcpListener::bind("127.0.0.1:8080").await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;
        println!("OAuth callback server started on http://127.0.0.1:8080");
        
        // 웹뷰 창에서 OAuth 처리
        let webview_window = WebviewWindowBuilder::new(
            app_handle,
            "google-oauth",
            WebviewUrl::External(auth_url.parse().unwrap())
        )
        .title("Google 로그인")
        .inner_size(500.0, 600.0)
        .resizable(false)
        .center()
        .build()
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?;

        // 콜백 대기
        let (tx, rx) = tokio::sync::oneshot::channel::<String>();
        let app_handle_clone = app_handle.clone();
        let webview_window_clone = webview_window.clone();
        let (abort_handle, abort_reg) = AbortHandle::new_pair();
        *OAUTH_ABORT_HANDLE.lock().unwrap() = Some(abort_handle);
        // 콜백 서버 태스크 (abortable)
        let abortable = Abortable::new(async move {
            match listener.accept().await {
                Ok((mut stream, _)) => {
                    let mut buffer = [0; 1024];
                    if let Ok(size) = stream.read(&mut buffer).await {
                        let request = String::from_utf8_lossy(&buffer[..size]);
                        println!("Received request: {}", request);
                        
                        // HTTP 요청 파싱
                        let first_line = request.lines().next().unwrap_or("");
                        println!("Request line: {}", first_line);
                        
                        // 올바른 콜백 경로인지 확인
                        if first_line.contains("GET /api/auth/google/callback") || 
                           first_line.contains("GET /auth/callback") {
                            // HTTP 요청에서 인증 코드 추출
                            if let Some(code) = extract_code_from_request(&request) {
                                println!("Extracted code: {}", code);
                                
                                // 성공 응답 전송
                                let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body><h1>로그인 성공!</h1><p>창을 닫아주세요.</p><script>window.close();</script></body></html>";
                                let _ = stream.write_all(response.as_bytes()).await;
                                
                                // 웹뷰 창 닫기
                                let _ = webview_window_clone.close();
                                
                                // 이벤트 전송
                                let _ = app_handle_clone.emit_to("main", "oauth-success", &code);
                                let _ = tx.send(code);
                            } else {
                                // 인증 코드가 없는 경우 (에러 또는 취소)
                                println!("No code found in request");
                                let response = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n<html><body><h1>로그인 실패</h1><p>인증 코드를 찾을 수 없습니다.</p></body></html>";
                                let _ = stream.write_all(response.as_bytes()).await;
                                let _ = app_handle_clone.emit_to("main", "oauth-error", "인증 코드를 찾을 수 없습니다");
                            }
                        } else {
                            // 잘못된 경로
                            println!("Invalid callback path");
                            let response = "HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\n\r\n<html><body><h1>404 - Not Found</h1><p>잘못된 경로입니다.</p></body></html>";
                            let _ = stream.write_all(response.as_bytes()).await;
                        }
                    }
                }
                Err(e) => {
                    println!("Accept error: {}", e);
                    let _ = app_handle_clone.emit_to("main", "oauth-error", format!("서버 오류: {}", e));
                }
            }
        }, abort_reg);
        tokio::spawn(abortable);
        // 타임아웃과 함께 결과 대기
        let code = tokio::time::timeout(
            tokio::time::Duration::from_secs(60), // 60초 타임아웃
            rx
        ).await
        .map_err(|_| "로그인 시간이 초과되었습니다")?
        .map_err(|_| "채널 수신 오류")?;
        // 로그인 성공/실패 후 AbortHandle 해제
        *OAUTH_ABORT_HANDLE.lock().unwrap() = None;
        Ok(code)
    }

    /// 사용자 정보로부터 직접 사용자 생성 (자동 로그인용)
    pub async fn create_user_from_info(&self, user_info: &GoogleUserInfo, db: &Database) -> Result<crate::database::User, Box<dyn std::error::Error + Send + Sync>> {
        // OAuth 프로세스가 이미 완료되었으므로, 기본 토큰 정보로 사용자 생성
        let expires_at = Utc::now() + Duration::seconds(3600); // 1시간 후 만료

        let create_request = CreateUserRequest {
            google_id: user_info.id.clone(),
            email: user_info.email.clone(),
            name: user_info.name.clone(),
            picture_url: user_info.picture.clone(),
            access_token: Some("temp_token".to_string()), // 임시 토큰
            refresh_token: None,
            token_expires_at: expires_at,
        };

        let user = db.upsert_user(&create_request).await
            .map_err(|e| format!("사용자 저장 실패: {}", e))?;

        Ok(user)
    }

    /// 콜백 데이터 저장
    pub fn set_callback_data(&self, code: String) {
        if let Ok(mut data) = self.callback_data.lock() {
            *data = Some(code);
        }
    }

    /// 콜백 데이터 가져오기 및 제거
    pub fn get_callback_data(&self) -> Option<String> {
        if let Ok(mut data) = self.callback_data.lock() {
            data.take()
        } else {
            None
        }
    }

    /// OAuth 로그인 취소 (AbortHandle 사용)
    pub fn cancel_oauth_login() {
        if let Some(handle) = OAUTH_ABORT_HANDLE.lock().unwrap().take() {
            handle.abort();
        }
    }
}

/// HTTP 요청에서 인증 코드 추출
fn extract_code_from_request(request: &str) -> Option<String> {
    // 여러 가능한 콜백 경로 처리
    for line in request.lines() {
        if line.starts_with("GET /api/auth/google/callback") || 
           line.starts_with("GET /auth/callback") {
            if let Some(query_start) = line.find('?') {
                let query_part = &line[query_start + 1..];
                if let Some(space_pos) = query_part.find(' ') {
                    let query_params = &query_part[..space_pos];
                    
                    for param in query_params.split('&') {
                        if let Some((key, value)) = param.split_once('=') {
                            if key == "code" {
                                return Some(urlencoding::decode(value).ok()?.into_owned());
                            }
                        }
                    }
                }
            }
        }
    }
    None
}
