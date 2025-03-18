'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface TypingBoxProps {
  onComplete: (record: {
    content: string;
    keyCount: number;
    typingTime: number;
    timestamp: string;
  }) => void;
}

const IDLE_TIMEOUT = 3000; // 3초

export function TypingBox({ onComplete }: TypingBoxProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [typingTime, setTypingTime] = useState<number>(0);
  const [keyCount, setKeyCount] = useState<number>(0);
  const [stats, setStats] = useState({
    pages: 0,
    words: 0,
    charCount: 0,
    charCountNoSpace: 0,
    accuracy: 100, // 정확도 추가
  });
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const compositionHandledRef = useRef<boolean>(false);
  const totalKeystrokesRef = useRef<number>(0); // 전체 입력 타수 (정확도 계산용)

  // 구글 문서 방식으로 통계 업데이트
  const updateStats = useCallback(() => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.textContent ?? '';
    
    // 구글 문서 방식의 단어 수(공백 기준 어절 분리)
    const words = content.trim().length > 0
      ? content.trim().split(/\s+/).length
      : 0;
    
    // 글자 수(공백 포함) - 모든 글자 1개씩 카운트
    const charCount = content.length;
    
    // 글자 수(공백 제외)
    const charCountNoSpace = content.replace(/\s/g, '').length;
    
    // 페이지 수 계산(600자 기준)
    const pages = Math.max(1, Math.ceil(charCount / 600));
    
    // 정확도 계산 (실제 환경에서는 원본 텍스트와 비교해야 함)
    // 여기서는 단순화하여 100% 정확도로 가정
    const accuracy = totalKeystrokesRef.current > 0 
      ? Math.round((keyCount / totalKeystrokesRef.current) * 100)
      : 100;

    setStats({
      pages,
      words,
      charCount,
      charCountNoSpace,
      accuracy,
    });
  }, [keyCount]);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const startTyping = useCallback(() => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    typingTimerRef.current = setInterval(() => {
      setTypingTime(prev => prev + 1);
    }, 1000);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, IDLE_TIMEOUT);
  }, [stopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // e.key가 한 글자이거나 스페이스/엔터일 때만 카운트
    if (e.key.length === 1 || e.key === ' ' || e.key === 'Enter') {
      // 한글 완성형은 2타, 나머지는 1타로 계산
      const isKorean = /[가-힣]/.test(e.key);
      const keystrokeCount = isKorean ? 2 : 1;
      
      setKeyCount(prev => prev + keystrokeCount);
      totalKeystrokesRef.current += keystrokeCount;
      
      startTyping();
      updateStats();
    }
  }, [startTyping, updateStats]);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    compositionHandledRef.current = true;
    let typeCount = 0;
    
    // 한글 완성형은 2타, 자음/모음은 1타, 다른 문자도 1타로 계산
    for (const char of e.data) {
      if (/[가-힣]/.test(char)) {
        typeCount += 2; // 한글 완성형은 2타
      } else if (/[ㄱ-ㅎ|ㅏ-ㅣ]/.test(char)) {
        typeCount += 1; // 한글 자음/모음은 1타
      } else {
        typeCount += 1; // 그 외 문자는 1타
      }
    }
    
    setKeyCount(prev => prev + typeCount);
    totalKeystrokesRef.current += typeCount;
    
    startTyping();
    updateStats();
  }, [startTyping, updateStats]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement> & { data?: string }) => {
    if (compositionHandledRef.current) {
      compositionHandledRef.current = false;
      return;
    }
    
    if (e.data) {
      // 각 문자별로 타수 계산
      let inputTypeCount = 0;
      for (const char of e.data) {
        if (/[가-힣]/.test(char)) {
          inputTypeCount += 2; // 한글 완성형은 2타
        } else {
          inputTypeCount += 1; // 그 외 문자는 1타
        }
      }
      
      setKeyCount(prev => prev + inputTypeCount);
      totalKeystrokesRef.current += inputTypeCount;
      
      startTyping();
      updateStats();
    }
  }, [startTyping, updateStats]);

  const handleSave = async () => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.textContent ?? '';
    const logData = {
      content,
      keyCount,
      typingTime,
      timestamp: new Date().toISOString(),
    };
    
    onComplete(logData);
    
    // 저장 후 초기화
    if (editorRef.current) editorRef.current.textContent = '';
    setKeyCount(0);
    setTypingTime(0);
    totalKeystrokesRef.current = 0;
    updateStats();
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div className="typing-box-container">
      <div className="status-bar">
        <div className="stats-display">
          <span>글자 수: {stats.charCount}(공백 제외: {stats.charCountNoSpace})</span>
          <span>단어 수: {stats.words}</span>
          <span>페이지 수: {stats.pages}</span>
          <span>타자 수: {keyCount}</span>
          <span>타이핑 시간: {typingTime}초</span>
          <span>타수: {typingTime > 0 ? Math.round((keyCount / typingTime) * 60) : 0}타/분</span>
          <span>정확도: {stats.accuracy}%</span>
        </div>
        <button className="save-button" onClick={handleSave}>저장</button>
      </div>
      
      <div
        ref={editorRef}
        className="editor"
        contentEditable
        onKeyDown={handleKeyDown}
        onCompositionEnd={handleCompositionEnd}
        onInput={handleInput}
      />
    </div>
  );
}