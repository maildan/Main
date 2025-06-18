import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { KakaoMessage, KakaoFile } from "../../../shared/types";

interface KakaoSectionProps {}

const KakaoSection = ({}: KakaoSectionProps) => {  // 상태 관리
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<KakaoMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [availableFiles, setAvailableFiles] = useState<KakaoFile[]>([]);
  const [isManualMode, setIsManualMode] = useState(false); // 수동/자동 모드 토글

  // 컴포넌트 마운트 시 사용자 ID 자동 감지
  useEffect(() => {
    const detectUserId = async () => {
      try {
        const detectedId = await invoke<string>("get_user_id");
        setUserId(detectedId);
        await searchKakaoFiles(detectedId);
      } catch (error) {
        console.log("사용자 ID 자동 감지 실패:", error);
        setErrorMessage("사용자 ID를 자동으로 감지할 수 없습니다. 수동으로 입력해주세요.");
      }
    };
    
    detectUserId();
  }, []);

  // 카카오톡 파일 검색
  const searchKakaoFiles = async (searchUserId?: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const userIdToUse = searchUserId || userId;
      
      if (!userIdToUse) {
        setErrorMessage("사용자 ID가 필요합니다");
        return;
      }

      const files = await invoke<KakaoFile[]>("search_kakao_files", { 
        userId: userIdToUse 
      });
      
      setAvailableFiles(files);
      
      if (files.length > 0) {
        console.log(`${files.length}개의 카카오톡 파일 발견`);
      } else {
        setErrorMessage("카카오톡 파일을 찾을 수 없습니다");
      }
    } catch (error) {
      console.error("파일 검색 실패:", error);
      setErrorMessage("카카오톡 파일 검색에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };  // 수동 파일 선택
  const handleManualFileSelect = async () => {
    try {
      const result = await open({
        title: "카카오톡 EDB 파일 선택",
        filters: [{
          name: "EDB 파일",
          extensions: ["edb"]
        }],
        multiple: false
      });

      if (result) {
        setSelectedFile(result as string);
        
        // 파일명에서 ID 추출하여 chatLog_{ID 요약} 형태로 표시
        const fileName = (result as string).split('\\').pop() || (result as string).split('/').pop() || "선택된 파일";
        let displayName = "선택된 파일"; // 기본값
        
        if (fileName.startsWith("chatLogs_") && fileName.endsWith(".edb")) {
          // chatLogs_{숫자ID}.edb에서 숫자 추출
          const idPart = fileName.slice(9, -4); // "chatLogs_"와 ".edb" 제거
          if (idPart.match(/^\d+$/)) {
            // ID를 6자리로 요약 (마지막 6자리 사용)
            const id = parseInt(idPart);
            const shortId = String(id % 1000000).padStart(6, '0');
            displayName = `chatLogs_${shortId}`;
          }
        }
        
        // 수동 선택 시에는 기존 목록을 대체 (하나만 선택 가능)
        setAvailableFiles([{
          path: result as string,
          name: displayName,
          size: 0 // 수동 선택 시에는 크기 정보 없음
        }]);
        
        setErrorMessage(null);
        console.log("수동 선택된 파일:", result);
      }
    } catch (error) {
      console.error("파일 선택 실패:", error);
      setErrorMessage("파일 선택에 실패했습니다");
    }
  };

  // 복호화 실행
  const handleDecryption = async () => {
    if (!selectedFile) {
      setErrorMessage("먼저 파일을 선택해주세요");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setMessages([]);      console.log("복호화 시작:", selectedFile);
      
      if (!userId) {
        setErrorMessage("사용자 ID를 입력해주세요");
        return;
      }
      
      const result = await invoke<KakaoMessage[]>("decrypt_kakao_edb", { 
        filePath: selectedFile,
        userId: userId
      });

      if (result && result.length > 0) {
        setMessages(result);
        setTotalCount(result.length);
        console.log(`복호화 성공: ${result.length}개 메시지`);
      } else {
        setErrorMessage("복호화는 성공했지만 메시지를 찾을 수 없습니다");
      }
    } catch (error) {
      console.error("복호화 실패:", error);
      setErrorMessage(`복호화 실패: ${error}`);
    } finally {
      setIsLoading(false);
    }  };

  // 사용자 ID 변경
  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
  };  // 파일 새로고침 (자동/수동 모드에 따라 다르게 동작)
  const handleRefresh = async () => {
    if (isManualMode) {
      // 수동 모드: 파일 선택 다이얼로그 열기
      await handleManualFileSelect();
    } else {
      // 자동 모드: 사용자 ID로 파일 검색
      if (userId) {
        await searchKakaoFiles();
      }
    }
  };

  // 모드 변경 시 상태 초기화
  const handleModeChange = (manual: boolean) => {
    setIsManualMode(manual);
    setSelectedFile(null);
    setAvailableFiles([]);
    setErrorMessage(null);
  };

  return (
    <div className="kakao-section">
      {/* 헤더 */}
      <div className="section-header">
        <h2>카카오톡 복호화</h2>
        <p>카카오톡 EDB 파일을 복호화하여 메시지를 확인합니다</p>
      </div>      {/* 사용자 ID 입력 및 파일 모드 선택 */}
      <div className="user-id-section">
        <label htmlFor="userId">사용자 ID:</label>
        <div className="input-group">
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={handleUserIdChange}
            placeholder="사용자 ID를 입력하세요"
            className="user-id-input"
            disabled={isManualMode}
          />          {/* 파일 모드 선택 (토글 스위치) */}
          <div className="mode-toggle-switch">
            <span className={`mode-label ${!isManualMode ? 'active' : ''}`}>
              자동 검색
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={isManualMode}
                onChange={(e) => handleModeChange(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
            <span className={`mode-label ${isManualMode ? 'active' : ''}`}>
              수동 선택
            </span>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={isLoading || (!userId && !isManualMode)}
            className="refresh-button"
          >
            {isLoading ? "처리 중..." : (isManualMode ? "파일 선택" : "파일 검색")}
          </button>
        </div>
      </div>      {/* 자동 감지된 파일 개수만 표시 */}      {!isManualMode && availableFiles.length > 0 && (
        <div className="auto-files-section">
          <div className="file-status-card">
            <h3 className="file-status-title found">검색 완료</h3>
            <p className="file-status-content">{availableFiles.length}개 파일 발견</p>
          </div>
        </div>
      )}

      {/* 수동 모드일 때 선택된 파일 표시 */}
      {isManualMode && selectedFile && (
        <div className="selected-file-section">
          <div className="file-status-card">
            <h4 className="file-status-title selected">선택된 파일</h4>
            <p className="file-status-content file-name">{availableFiles.find(f => f.path === selectedFile)?.name || "선택된 파일"}</p>
          </div>
        </div>
      )}

      {/* 복호화 버튼 */}
      <div className="decrypt-section">
        <button 
          onClick={handleDecryption}
          disabled={isLoading || !selectedFile}
          className="decrypt-button"
        >
          {isLoading ? "복호화 중..." : "복호화 시작"}
        </button>
      </div>

      {/* 오류 메시지 */}
      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}      {/* 복호화 결과 */}
      {messages.length > 0 && (
        <div className="results-section">
          <h3>복호화 결과 ({totalCount}개 메시지)</h3>
          <div className="messages-container">
            {messages.slice(0, 50).map((message, index) => (
              <div key={message.id || index} className="message-item">
                <div className="message-header">
                  <span className="message-id">ID: {message.id}</span>
                  <span className="message-timestamp">{message.created_at}</span>
                </div>
                <div className="message-sender">사용자: {message.user_id}</div>
                <div className="message-content">{message.message}</div>
                <div className="message-type">타입: {message.type}</div>
                {message.attachment && (
                  <div className="message-attachment">첨부파일: {message.attachment}</div>
                )}
              </div>
            ))}
            {messages.length > 50 && (
              <div className="more-messages">
                ... 및 {messages.length - 50}개 더 많은 메시지
              </div>
            )}
          </div>
        </div>
      )}

      {/* 로딩 스피너 */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>처리 중...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KakaoSection;