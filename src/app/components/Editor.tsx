'use client';

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  KeyboardEvent,
} from 'react';

interface Stats {
  pages: number;
  words: number;
  charCount: number;
  charCountNoSpace: number;
  keyCount: number;
  typingTime: number;
}

interface EditorProps {
  onStatsUpdate: (stats: Stats) => void;
  onSaveLog: () => void;
}

const IDLE_TIMEOUT = 3000; // 3초

const Editor: React.FC<EditorProps> = ({ onStatsUpdate, onSaveLog }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const [typingTime, setTypingTime] = useState<number>(0);
  const [keyCount, setKeyCount] = useState<number>(0);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const compositionHandledRef = useRef<boolean>(false);

  const updateStats = useCallback(() => {
    const content = editorRef.current?.textContent ?? '';
    const pages = Math.max(1, Math.ceil(content.length / 600));
    const words =
      content.trim().length > 0
        ? content.trim().split(/\s+/).filter((w) => w.length > 0).length
        : 0;
    const charCount = content.length;
    const charCountNoSpace = content.replace(/\s/g, '').length;

    onStatsUpdate({
      pages,
      words,
      charCount,
      charCountNoSpace,
      keyCount,
      typingTime,
    });
  }, [keyCount, typingTime, onStatsUpdate]);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const startTyping = useCallback(() => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    typingTimerRef.current = setInterval(() => {
      setTypingTime((prev) => prev + 1);
    }, 1000);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, IDLE_TIMEOUT);
  }, [stopTyping]);

  // 일반 키보드 입력
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // e.key가 한 글자이거나 스페이스/엔터일 때만 카운트
      if (e.key.length === 1 || e.key === ' ' || e.key === 'Enter') {
        const isKorean = /[가-힣]/.test(e.key);
        setKeyCount((prev) => prev + (isKorean ? 2 : 1));
        startTyping();
        updateStats();
      }
    },
    [startTyping, updateStats]
  );

  // 한글 입력 완료
  const handleCompositionEnd = useCallback(
    (e: CompositionEvent) => {
      compositionHandledRef.current = true;
      let typeCount = 0;
      for (const char of e.data) {
        if (/[가-힣]/.test(char)) {
          typeCount += 2;
        } else if (/[ㄱ-ㅎ|ㅏ-ㅣ]/.test(char)) {
          typeCount += 1;
        } else {
          typeCount += 1;
        }
      }
      setKeyCount((prev) => prev + typeCount);
      startTyping();
      updateStats();
    },
    [startTyping, updateStats]
  );

  // input 이벤트 (compositionEnd 후에도 발생)
  const handleInput = useCallback(
    (e: InputEvent) => {
      if (compositionHandledRef.current) {
        compositionHandledRef.current = false;
        return;
      }
      if (e.data) {
        const inputLen = e.data.length;
        setKeyCount((prev) => prev + inputLen);
        startTyping();
        updateStats();
      }
    },
    [startTyping, updateStats]
  );

  // 저장
  const handleSave = async () => {
    const content = editorRef.current?.textContent ?? '';
    const logData = {
      content,
      keyCount,
      typingTime,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/saveLogs', {  // 수정된 경로: saveLog -> saveLogs
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
      const data = await res.json();
      if (data.success) {
        onSaveLog();
      }
    } catch (error: unknown) {
      console.error('저장 오류:', error);
    }
  };

  // 이벤트 등록
  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;

    const keyDownHandler = (e: Event) =>
      handleKeyDown(e as unknown as KeyboardEvent<HTMLDivElement>);
    const compositionEndHandler = (e: Event) =>
      handleCompositionEnd(e as unknown as CompositionEvent);
    const inputHandler = (e: Event) => handleInput(e as unknown as InputEvent);

    editorEl.addEventListener('keydown', keyDownHandler);
    editorEl.addEventListener('compositionend', compositionEndHandler);
    editorEl.addEventListener('input', inputHandler);

    return () => {
      editorEl.removeEventListener('keydown', keyDownHandler);
      editorEl.removeEventListener('compositionend', compositionEndHandler);
      editorEl.removeEventListener('input', inputHandler);

      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleKeyDown, handleCompositionEnd, handleInput]);

  return (
    <div>
      <div
        ref={editorRef}
        contentEditable
        style={{
          border: '1px solid #ccc',
          minHeight: '200px',
          padding: '10px',
        }}
      />
      <button type="button" onClick={handleSave}>
        저장
      </button>
    </div>
  );
};

export default Editor;
