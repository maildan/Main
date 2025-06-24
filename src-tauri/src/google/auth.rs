use oauth2::{
    AuthUrl, ClientId, ClientSecret, CsrfToken,
    RedirectUrl, Scope, TokenUrl, AuthorizationCode, TokenResponse,
};
use oauth2::basic::BasicClient;
use reqwest::Client as HttpClient;
use serde_json::Value;
use crate::database::{Database, GoogleOAuthResponse, GoogleUserInfo, CreateUserRequest};
use crate::config::GoogleConfig;
use chrono::{Utc, Duration};
use std::collections::HashMap;

/// Google OAuth API 엔드포인트
const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://www.googleapis.com/oauth2/v4/token";
const GOOGLE_USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";

/// Google OAuth 관리 구조체
pub struct GoogleOAuth {
    client: BasicClient,
    http_client: HttpClient,
    config: GoogleConfig,
}

impl Clone for GoogleOAuth {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            http_client: self.http_client.clone(),
            config: self.config.clone(),
        }
    }
}

impl GoogleOAuth {
    /// 새로운 GoogleOAuth 인스턴스 생성
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // # debug: GoogleOAuth 초기화 시작        println!("✓ Google OAuth ready");
        
        let config = GoogleConfig::from_env()
            .map_err(|e| format!("Google OAuth 설정 로드 실패: {}", e))?;

        let client = BasicClient::new(
            ClientId::new(config.client_id.clone()),
            Some(ClientSecret::new(config.client_secret.clone())),
            AuthUrl::new(GOOGLE_AUTH_URL.to_string())?,
            Some(TokenUrl::new(GOOGLE_TOKEN_URL.to_string())?),
        )
        .set_redirect_uri(RedirectUrl::new(config.redirect_url.clone())?);

        let http_client = HttpClient::new();

        Ok(Self {
            client,
            http_client,
            config,
        })
    }/// OAuth 인증 URL 생성
    pub fn get_auth_url(&self) -> Result<String, Box<dyn std::error::Error>> {
        // OAuth 인증 URL 생성
        let (auth_url, _csrf_token) = self
            .client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("openid".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .add_scope(Scope::new("https://www.googleapis.com/auth/documents".to_string()))
            .add_scope(Scope::new("https://www.googleapis.com/auth/drive.metadata.readonly".to_string()))
            .url();

        Ok(auth_url.to_string())
    }

    /// Authorization Code를 Access Token으로 교환
    pub async fn exchange_code(&self, code: &str) -> Result<GoogleOAuthResponse, Box<dyn std::error::Error>> {
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
    pub async fn get_user_info(&self, access_token: &str) -> Result<GoogleUserInfo, Box<dyn std::error::Error>> {
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
    pub async fn refresh_access_token(&self, refresh_token: &str) -> Result<GoogleOAuthResponse, Box<dyn std::error::Error>> {
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
    }    /// 사용자 인증 및 데이터베이스 저장
    pub async fn authenticate_user(&self, code: &str, db: &Database) -> Result<crate::database::User, Box<dyn std::error::Error>> {
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
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            token_expires_at: expires_at,
        };

        let user = db.upsert_user(&create_request).await
            .map_err(|e| format!("사용자 저장 실패: {}", e))?;

        Ok(user)
    }

    /// 토큰 유효성 검사 및 자동 갱신
    pub async fn ensure_valid_token(&self, user: &mut crate::database::User, db: &Database) -> Result<(), Box<dyn std::error::Error>> {
        // 토큰이 5분 이내에 만료되면 갱신
        let now = Utc::now();
        let expires_soon = user.token_expires_at - Duration::minutes(5);        if now >= expires_soon {
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
            user.access_token = token_response.access_token;
            if let Some(new_refresh_token) = token_response.refresh_token {
                user.refresh_token = Some(new_refresh_token);
            }
            user.token_expires_at = new_expires_at;
        }

        Ok(())
    }
}
