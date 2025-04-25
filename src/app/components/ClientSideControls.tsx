'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import styles from './ClientSideControls.module.css';

// 연결된 앱 인터페이스
interface ConnectedApp {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  lastActive: string;
  status: 'connected' | 'disconnected' | 'pending';
}

// 타이핑 데이터 인터페이스
interface TypingData {
  keyCount: number;
  typingTime: number;
  accuracy: number;
  app?: string;
}

interface AppConnectionProps {
  onAppConnect?: (appId: string) => void;
  onAppDisconnect?: (appId: string) => void;
}

export default function AppConnection(props: AppConnectionProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [appStats, setAppStats] = useState<{[key: string]: TypingData}>({});
  const [isAddingApp, setIsAddingApp] = useState(false);
  const [newAppName, setNewAppName] = useState('');

  // 샘플 앱 데이터 로드 (실제로는 API에서 가져옴)
  useEffect(() => {
    // 최근 사용 앱 불러오기
    const sampleApps: ConnectedApp[] = [
      {
        id: 'chrome',
        name: '구글 크롬',
        icon: '🌐',
        isActive: true,
        lastActive: new Date().toISOString(),
        status: 'connected'
      },
      {
        id: 'vscode',
        name: 'VS Code',
        icon: '💻',
        isActive: false,
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        status: 'connected'
      },
      {
        id: 'word',
        name: 'Microsoft Word',
        icon: '📝',
        isActive: false,
        lastActive: new Date(Date.now() - 7200000).toISOString(),
        status: 'disconnected'
      }
    ];
    
    setConnectedApps(sampleApps);
    
    // 샘플 통계 데이터
    const sampleStats: {[key: string]: TypingData} = {
      'chrome': {
        keyCount: 1250,
        typingTime: 620,
        accuracy: 97.5
      },
      'vscode': {
        keyCount: 3420,
        typingTime: 1200,
        accuracy: 98.2
      },
      'word': {
        keyCount: 845,
        typingTime: 340,
        accuracy: 95.1
      }
    };
    
    setAppStats(sampleStats);
  }, []);

  const startTracking = () => {
    setIsTracking(true);
    // 모든 앱의 상태를 활성으로 변경
    setConnectedApps(prev => 
      prev.map(app => ({
        ...app,
        isActive: true,
        status: 'connected'
      }))
    );
  };

  const stopTracking = () => {
    setIsTracking(false);
    // 모든 앱의 상태를 비활성으로 변경
    setConnectedApps(prev => 
      prev.map(app => ({
        ...app,
        isActive: false
      }))
    );
  };

  const toggleAppConnection = (appId: string) => {
    setConnectedApps(prev => 
      prev.map(app => {
        if (app.id === appId) {
          const newStatus = app.status === 'connected' ? 'disconnected' : 'connected';
          
          // 콜백 호출
          if (newStatus === 'connected' && props.onAppConnect) {
            props.onAppConnect(appId);
          } else if (newStatus === 'disconnected' && props.onAppDisconnect) {
            props.onAppDisconnect(appId);
          }
          
          return {
            ...app,
            status: newStatus,
            lastActive: new Date().toISOString()
          };
        }
        return app;
      })
    );
  };
  
  const addNewApp = () => {
    if (newAppName.trim() === '') return;
    
    const newApp: ConnectedApp = {
      id: `app-${Date.now()}`,
      name: newAppName,
      icon: '📱',
      isActive: false,
      lastActive: new Date().toISOString(),
      status: 'pending'
    };
    
    setConnectedApps(prev => [...prev, newApp]);
    setNewAppName('');
    setIsAddingApp(false);
  };
  
  const removeApp = (appId: string) => {
    setConnectedApps(prev => prev.filter(app => app.id !== appId));
    
    // 선택된 앱이 삭제되는 경우 선택 해제
    if (selectedApp === appId) {
      setSelectedApp(null);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">연결됨</Badge>;
      case 'disconnected':
        return <Badge className="bg-gray-500">연결 끊김</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">연결 중</Badge>;
      default:
        return <Badge className="bg-red-500">오류</Badge>;
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-medium">앱 연결 관리</h2>
        
        <div className="flex gap-2">
          <button
            onClick={startTracking}
            disabled={isTracking}
            className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 disabled:bg-blue-300"
          >
            모든 앱 모니터링 시작
          </button>

          <button
            onClick={stopTracking}
            disabled={!isTracking}
            className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600 disabled:bg-red-300"
          >
            모니터링 중지
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 font-medium">연결된 앱</h3>
        <div className="space-y-3">
          {connectedApps.map(app => (
            <div 
              key={app.id} 
              className={`flex items-center justify-between rounded-lg border p-3 ${
                app.isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
              } ${selectedApp === app.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelectedApp(app.id === selectedApp ? null : app.id)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{app.icon}</span>
                <div>
                  <div className="font-medium">{app.name}</div>
                  <div className="text-xs text-gray-500">
                    최근 활동: {new Date(app.lastActive).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusBadge(app.status)}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAppConnection(app.id);
                  }}
                  className={`rounded px-2 py-1 text-xs ${
                    app.status === 'connected' 
                      ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300'
                  }`}
                >
                  {app.status === 'connected' ? '연결 해제' : '연결'}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeApp(app.id);
                  }}
                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {isAddingApp ? (
          <div className="mt-3 flex items-center space-x-2">
            <input
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="앱 이름 입력"
              className="flex-1 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-700"
            />
            <button
              onClick={addNewApp}
              className="rounded bg-green-500 px-3 py-1 text-white hover:bg-green-600"
            >
              추가
            </button>
            <button
              onClick={() => setIsAddingApp(false)}
              className="rounded bg-gray-300 px-3 py-1 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingApp(true)}
            className="mt-3 flex items-center rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400"
          >
            <span className="mr-2">+</span> 새 앱 추가
          </button>
        )}
      </div>

      {selectedApp && appStats[selectedApp] && (
        <div className="rounded-md border bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
          <h3 className="mb-2 font-medium">
            {connectedApps.find(app => app.id === selectedApp)?.name} 통계
          </h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-500">키 입력 수</p>
              <p className="font-medium">{appStats[selectedApp].keyCount}</p>
            </div>
            <div>
              <p className="text-gray-500">총 시간</p>
              <p className="font-medium">{appStats[selectedApp].typingTime}초</p>
            </div>
            <div>
              <p className="text-gray-500">정확도</p>
              <p className="font-medium">{appStats[selectedApp].accuracy}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
