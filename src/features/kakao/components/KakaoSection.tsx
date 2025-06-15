import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { KakaoMessage, KakaoFile, KakaoDecryptionResult, AnalysisProgress } from "../../../shared/types";
import { AnalysisProgress as AnalysisProgressComponent } from "../../analysis/components/AnalysisProgress";

interface KakaoSectionProps {
  // props 제거
}

const KakaoSection = ({ }: KakaoSectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<KakaoMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>(""); // 내부적으로만 사용
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [availableFiles, setAvailableFiles] = useState<KakaoFile[]>([]);
  
  // 키 분석 관련 상태
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    static_progress: 0,
    dynamic_progress: 0,
    total_progress: 0,
    current_task: "대기 중...",
    is_running: false,
    keys_candidates_found: 0,
  });
  const [showAnalysis, setShowAnalysis] = useState(false);
  // 컴포넌트 마운트 시 자동으로 사용자 ID 감지
  useEffect(() => {
    const detectUserId = async () => {
      try {
        const detectedId = await invoke<string>("get_user_id");
        setUserId(detectedId);
      } catch (error) {
        console.log("사용자 ID 자동 감지 실패:", error);
        // 실패해도 계속 진행
      }
    };
    
    detectUserId();
  }, []);

  // 진행률 이벤트 리스너
  useEffect(() => {
    const unsubscribe = listen<AnalysisProgress>('analysis-progress', (event) => {
      setAnalysisProgress(event.payload);
      
      // 분석이 완료되면 실제 복호화 진행
      if (!event.payload.is_running && event.payload.total_progress >= 100) {
        performDecryption();
      }
    });

    return () => {
      unsubscribe.then(f => f());
    };
  }, [selectedFile, userId]);
  // 실제 복호화 수행
  const performDecryption = async () => {
    if (!selectedFile) return;

    // 사용자 ID가 없으면 다시 감지 시도
    let currentUserId = userId;
    if (!currentUserId.trim()) {
      try {
        currentUserId = await invoke<string>("get_user_id");
        setUserId(currentUserId);
      } catch (error) {
        setErrorMessage("사용자 ID를 자동으로 감지할 수 없습니다. 카카오톡이 설치되어 있는지 확인해주세요.");
        setIsLoading(false);
        return;
      }
    }

    try {
      console.log("=== 카카오톡 복호화 시작 ===");
      console.log("파일:", selectedFile);
      console.log("사용자 ID:", currentUserId);
      
      const result = await invoke<KakaoDecryptionResult>("decrypt_kakao_edb", {
        filePath: selectedFile,
        userId: currentUserId.trim()
      });
      
      console.log("✅ 복호화 성공! 메시지 수:", result.total_count);
      setMessages(result.messages);
      setTotalCount(result.total_count);
      setShowAnalysis(false);
    } catch (error) {
      console.error("❌ 복호화 실패:", error);
      setErrorMessage(`복호화 실패: ${error}`);
      setShowAnalysis(false);
    } finally {
      setIsLoading(false);
    }
  };
  // 카카오톡 파일 찾기
  const findKakaoFiles = async () => {
    try {
      setIsLoading(true);
      const files = await invoke<KakaoFile[]>("find_kakao_files");
      setAvailableFiles(files);
      if (files.length === 0) {
        setErrorMessage("카카오톡 .edb 파일을 찾을 수 없습니다.");
      }
    } catch (error) {
      setErrorMessage(`파일 검색 중 오류: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 선택
  const selectFile = async () => {
    try {
      const selected = await open({
        filters: [
          {
            name: "KakaoTalk Database",
            extensions: ["edb"]
          }
        ]
      });
      
      if (selected && typeof selected === "string") {
        setSelectedFile(selected);
      }    } catch (error) {
      setErrorMessage(`파일 선택 중 오류: ${error}`);
    }
  };  // .edb 파일 복호화
  const decryptFile = async () => {
    if (!selectedFile || !userId.trim()) {
      setErrorMessage("파일과 사용자 ID를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setShowAnalysis(true);
      setErrorMessage(null);
      
      // 키 분석 시작
      await invoke("start_kakao_key_analysis");
      
    } catch (error) {
      console.error("❌ 키 분석 시작 실패:", error);
      setErrorMessage(`키 분석 시작 실패: ${error}`);
      setIsLoading(false);
      setShowAnalysis(false);
    }
  };

  // 메시지 타입 텍스트 변환
  const getMessageTypeText = (type: number) => {
    switch (type) {
      case 1: return "텍스트";
      case 2: return "이미지";
      case 3: return "파일";
      case 4: return "음성";
      case 5: return "동영상";
      case 12: return "이모티콘";
      case 13: return "연락처";
      case 18: return "선물하기";
      case 22: return "음성메모";
      case 23: return "플러스친구";
      case 26: return "삭제된 메시지";
      default: return `타입 ${type}`;
    }
  };

  // 시간 포맷팅
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ko-KR");
    } catch {    return dateString;
    }
  };

  // 진행률 이벤트 리스너 설정
  useEffect(() => {
    const unlisten = listen<AnalysisProgress>('analysis-progress', (event) => {
      setAnalysisProgress(event.payload);
    });    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // 키 분석 중단
  const cancelKeyAnalysis = async () => {
    try {
      await invoke("cancel_kakao_key_analysis");
      setShowAnalysis(false);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(`분석 중단 실패: ${error}`);
    }
  };

  return (
    <div className="kakao-section">
      <div className="section-header">
        <h2>🗨️ 카카오톡 채팅 복호화</h2>
        <p>카카오톡 .edb 파일을 복호화하여 채팅 내역을 확인합니다.</p>
      </div>

      {/* 컨트롤 패널 */}
      <div className="control-panel">        <div className="file-selection">
          <h3>1. 파일 선택</h3>
          <div className="button-group">
            <button 
              onClick={findKakaoFiles} 
              disabled={isLoading}
              className="btn-primary"
            >
              자동 검색
            </button>            <button 
              onClick={selectFile} 
              disabled={isLoading}
              className="btn-secondary"
            >
              수동 선택
            </button>
          </div>
          
          {availableFiles.length > 0 && (
            <div className="file-list">
              <h4>발견된 파일들:</h4>
              {availableFiles.map((file, index) => (
                <div 
                  key={index} 
                  className={`file-item ${selectedFile === file.path ? 'selected' : ''}`}
                  onClick={() => setSelectedFile(file.path)}
                >
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ))}
            </div>
          )}
          
          {selectedFile && (
            <div className="selected-file">
              <strong>선택된 파일:</strong> {selectedFile}
            </div>
          )}
        </div>        <div className="decrypt-section">
          <h3>2. 복호화 실행</h3>
          <div className="button-group">
            <button
              onClick={decryptFile}
              disabled={isLoading || !selectedFile}
              className="btn-primary decrypt-btn"
            >
              {isLoading ? "복호화 중..." : "복호화 시작"}
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="error-message">
          ❌ {errorMessage}
        </div>
      )}

      {/* 결과 표시 */}
      {messages.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3>복호화 결과</h3>
            <div className="message-count">
              총 {totalCount}개의 메시지 중 {messages.length}개 표시
            </div>
          </div>
          
          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className="message-item">
                <div className="message-header">
                  <span className="message-type">
                    {getMessageTypeText(message.type)}
                  </span>
                  <span className="message-time">
                    {formatDate(message.created_at)}
                  </span>
                  <span className="user-id">
                    ID: {message.user_id}
                  </span>
                </div>
                <div className="message-content">
                  {message.message || "(내용 없음)"}
                </div>
                {message.attachment && (
                  <div className="message-attachment">
                    📎 첨부파일: {message.attachment}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}      {/* 키 분석 진행 상황 */}
      {showAnalysis && (
        <AnalysisProgressComponent
          staticProgress={analysisProgress.static_progress}
          dynamicProgress={analysisProgress.dynamic_progress}
          totalProgress={analysisProgress.total_progress}
          currentTask={analysisProgress.current_task}
          isRunning={analysisProgress.is_running}
          keysCandidatesFound={analysisProgress.keys_candidates_found}
          onCancel={cancelKeyAnalysis}
        />
      )}
    </div>
  );
};

export default KakaoSection;
