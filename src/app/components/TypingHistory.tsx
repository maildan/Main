'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './TypingHistory.module.css';
import { Badge } from './ui/badge';

interface AppInfo {
  id: string;
  name: string;
  icon: string;
}

interface LogType {
  id: number;
  content: string;
  key_count: number;
  typing_time: number;
  timestamp: string;
  created_at: string;
  app?: string; // 어떤 앱에서 기록되었는지
  browser?: string; // 브라우저 정보
  window_title?: string; // 창 제목
  accuracy?: number; // 정확도 필드 추가
}

interface TypingHistoryProps {
  logs: LogType[];
  isLoading: boolean;
}

export function TypingHistory({ logs, isLoading }: TypingHistoryProps) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const monitoredApps = useMemo(() => {
    const appMap = new Map<string, AppInfo>();
    logs.forEach((log, index) => {
      const appName = log.app || log.browser || '알 수 없음';
      if (!appMap.has(appName)) {
        appMap.set(appName, {
          id: `app-${appName}-${index}`,
          name: appName,
          icon: getAppIcon(appName),
        });
      }
    });
    return Array.from(appMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const getAppIcon = (appName: string): string => {
    const lowerName = appName?.toLowerCase() || '';
    if (lowerName.includes('chrome')) return '🌐';
    if (lowerName.includes('word')) return '📝';
    if (lowerName.includes('excel')) return '📊';
    if (lowerName.includes('code') || lowerName.includes('studio')) return '💻';
    if (lowerName.includes('slack')) return '💬';
    if (lowerName.includes('notion')) return '📘';
    if (lowerName.includes('explorer') || lowerName.includes('finder')) return '📁';
    if (lowerName.includes('powerpoint')) return '💡';
    if (lowerName.includes('photoshop')) return '🎨';
    if (lowerName.includes('terminal') || lowerName.includes('cmd') || lowerName.includes('powershell')) return '⌨️';
    return '📱';
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const appMatch = !selectedApp || (log.app || log.browser || '알 수 없음') === selectedApp;
      const searchTermLower = searchTerm.toLowerCase();
      const searchMatch = searchTerm === '' ||
                          log.content?.toLowerCase().includes(searchTermLower) ||
                          log.window_title?.toLowerCase().includes(searchTermLower) ||
                          log.app?.toLowerCase().includes(searchTermLower) ||
                          log.browser?.toLowerCase().includes(searchTermLower);
      return appMatch && searchMatch;
    });
  }, [logs, selectedApp, searchTerm]);

  const groupedLogs = useMemo(() => {
    return filteredLogs.reduce((groups: { [key: string]: LogType[] }, log) => {
      const date = new Date(log.timestamp).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
      return groups;
    }, {});
  }, [filteredLogs]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedLogs).sort((a, b) => new Date(b.split(' (')[0]).getTime() - new Date(a.split(' (')[0]).getTime());
  }, [groupedLogs]);

  if (isLoading) {
    return <div className={styles.loading}>채팅로그 로딩 중...</div>;
  }

  if (logs.length === 0 && !isLoading) {
    return <div className={styles.noData}>저장된 타이핑 기록이 없습니다.</div>;
  }

  return (
    <div className={styles.historyContainer}>
      <div className={styles.headerSection}>
        <h2 className="text-xl font-semibold">채팅로그</h2>
        <div className={styles.filterControls}>
          <div className={styles.appFilter}>
            <span className="text-sm font-medium mr-2">앱 필터:</span>
            <button
              className={`${styles.appButton} ${selectedApp === null ? styles.selected : ''}`}
              onClick={() => setSelectedApp(null)}
            >
              <span className={styles.appIcon}>🔄</span> 전체
            </button>
            {monitoredApps.map(app => (
              <button
                key={app.id}
                className={`${styles.appButton} ${selectedApp === app.name ? styles.selected : ''}`}
                onClick={() => setSelectedApp(app.name)}
                title={app.name}
              >
                <span className={styles.appIcon}>{app.icon}</span>
                <span className={styles.appNameText}>{app.name}</span>
              </button>
            ))}
          </div>
          <div className={styles.searchBar}>
             <input
               type="text"
               placeholder="로그 내용, 창 제목, 앱 이름 검색..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className={styles.searchInput}
             />
          </div>
        </div>
      </div>

       {filteredLogs.length === 0 && !isLoading && (
         <div className={styles.noData}>선택된 필터 또는 검색어에 해당하는 기록이 없습니다.</div>
       )}

      <div className={styles.chatList}>
        {sortedDateKeys.map((date) => (
          <div key={date} className={styles.dateGroup}>
            <div className={styles.dateHeader}>
              <Badge variant="outline" className="text-sm">{date}</Badge>
            </div>

            {groupedLogs[date].map(log => (
              <div key={log.id} className={styles.chatItem}>
                <div className={styles.chatHeader}>
                  <span className={styles.appBubble}>
                    {getAppIcon(log.app || log.browser || '알 수 없음')}
                    <span className={styles.appName}>{log.app || log.browser || '알 수 없음'}</span>
                  </span>
                  <span className={styles.chatTime}>
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {log.window_title && (
                  <div className={styles.windowTitle}>
                    <span className="font-medium">창 제목:</span> {log.window_title}
                  </div>
                )}

                <div className={styles.chatContent}>
                  {searchTerm ? (
                    <span dangerouslySetInnerHTML={{ __html: highlightText(log.content, searchTerm) }} />
                  ) : (
                    log.content
                  )}
                </div>

                <div className={styles.chatMeta}>
                  <Badge variant="secondary" className={styles.metaBadge}>타수: {log.key_count}</Badge>
                  <Badge variant="secondary" className={styles.metaBadge}>시간: {log.typing_time}초</Badge>
                  <Badge variant="secondary" className={styles.metaBadge}>
                    속도: {Math.round(log.typing_time > 0 ? (log.key_count / log.typing_time) * 60 : 0)}타/분
                  </Badge>
                  {log.accuracy !== undefined && (
                    <Badge variant="secondary" className={styles.metaBadge}>정확도: {log.accuracy.toFixed(1)}%</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        .${styles.historyContainer} { padding: 1rem; }
        .${styles.headerSection} { margin-bottom: 1rem; }
        .${styles.filterControls} { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem; align-items: center; }
        .${styles.appFilter} { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
        .${styles.searchBar} { flex-grow: 1; min-width: 200px; }
        .${styles.searchInput} { width: 100%; padding: 0.4rem 0.8rem; border-radius: 1rem; border: 1px solid #ccc; font-size: 0.85rem; background-color: var(--input-bg); color: var(--text-color); }
        .${styles.appButton} { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 1rem; border: 1px solid #ccc; background: var(--button-bg); color: var(--text-color); cursor: pointer; transition: all 0.2s; font-size: 0.8rem; white-space: nowrap; }
        .${styles.appButton}:hover { background: var(--button-hover-bg); }
        .${styles.appButton}.${styles.selected} { background: #0070f3; color: white; border-color: #0070f3; }
        .${styles.appIcon} { font-size: 1rem; margin-right: 2px; }
        .${styles.appNameText} { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle; }
        .${styles.chatList} { display: flex; flex-direction: column; gap: 1rem; max-height: calc(100vh - 250px); overflow-y: auto; padding-right: 0.5rem; }
        .${styles.dateGroup} { display: flex; flex-direction: column; gap: 0.75rem; }
        .${styles.dateHeader} { display: flex; justify-content: center; margin: 0.5rem 0; }
        .${styles.chatItem} { background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.8rem 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .${styles.chatHeader} { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
        .${styles.appBubble} { display: flex; align-items: center; gap: 6px; font-weight: 500; font-size: 0.9rem; }
        .${styles.appName} { font-size: 0.9rem; }
        .${styles.chatTime} { font-size: 0.75rem; color: #777; }
        .${styles.windowTitle} { font-size: 0.8rem; color: #555; margin-bottom: 0.5rem; border-left: 3px solid #eee; padding-left: 0.5rem; background-color: rgba(0,0,0,0.02); border-radius: 3px; padding: 4px 8px;}
        .${styles.chatContent} { white-space: pre-wrap; word-break: break-word; line-height: 1.5; font-size: 0.9rem; margin-top: 0.3rem; }
        .${styles.chatMeta} { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 0.75rem; }
        .${styles.metaBadge} { font-size: 0.7rem; }
        .highlight { background-color: yellow; font-weight: bold; }

        .dark-mode .${styles.searchInput} { background-color: #333; border-color: #555; color: #eee; }
        .dark-mode .${styles.appButton} { background: #333; border-color: #555; color: #ccc; }
        .dark-mode .${styles.appButton}:hover { background: #444; }
        .dark-mode .${styles.appButton}.${styles.selected} { background: #0070f3; color: white; border-color: #0070f3; }
        .dark-mode .${styles.chatItem} { background-color: #2a2a2a; border-color: #444; }
        .dark-mode .${styles.chatTime} { color: #aaa; }
        .dark-mode .${styles.windowTitle} { color: #bbb; border-left-color: #555; background-color: rgba(255,255,255,0.05); }
        .dark-mode .highlight { background-color: #ff0; color: #333; }
      `}</style>
    </div>
  );
}

function highlightText(text: string | undefined, term: string): string {
  if (!text) return '';
  if (!term) return text;
  const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}