'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';

interface GpuInfo {
  features: Record<string, string>;
  settings: {
    gpuAcceleration: boolean;
    hardwareAcceleration: boolean;
    vsync: boolean;
    webGLEnabled: boolean;
    batteryOptimizationMode: string;
    onBattery?: boolean;
  };
  acceleration: boolean;
  hardwareAcceleration: boolean;
  timestamp: number;
}

export default function GpuTestPage() {
  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batteryMode, setBatteryMode] = useState(false);

  // GPU 정보 로드
  useEffect(() => {
    const fetchGpuInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Electron IPC를 통해 GPU 정보 요청
        // @ts-ignore - window.electron은 Electron 환경에서만 사용 가능
        if (window.electron) {
          // @ts-ignore
          const info = await window.electron.getGpuInfo();
          setGpuInfo(info);
        } else {
          throw new Error('Electron 환경에서만 사용할 수 있습니다.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGpuInfo();

    // 설정 변경 이벤트 리스너
    // @ts-ignore
    const handleGpuSettingsChanged = (_event, _data) => {
      fetchGpuInfo();
    };

    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      window.electron.on('gpu-settings-changed', handleGpuSettingsChanged);
    }

    return () => {
      // @ts-ignore
      if (window.electron) {
        // @ts-ignore
        window.electron.off('gpu-settings-changed', handleGpuSettingsChanged);
      }
    };
  }, []);

  // GPU 가속 설정 변경
  const handleToggleAcceleration = async () => {
    if (!gpuInfo) return;
    
    try {
      // @ts-ignore
      await window.electron.setGpuAcceleration(!gpuInfo.acceleration);
      // 앱 재시작 메시지 표시
      alert('GPU 가속 설정이 변경되었습니다. 설정을 적용하려면 앱을 재시작하세요.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 변경 중 오류가 발생했습니다.');
    }
  };

  // 배터리 최적화 모드 설정 변경
  const handleToggleBatteryMode = async () => {
    try {
      // @ts-ignore
      await window.electron.optimizeForBattery(!batteryMode);
      setBatteryMode(!batteryMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '배터리 최적화 모드 설정 중 오류가 발생했습니다.');
    }
  };

  const _handleWorkerMessage = useCallback((event: MessageEvent) => {
    const _data = event.data;
    // ... logic
  }, []);

  const _handleTestButtonClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const _event = event;
    // ... logic
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">GPU 설정 및 진단</h1>
      
      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card className="bg-destructive/10 mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : gpuInfo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GPU 설정 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>GPU 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="gpu-acceleration" className="flex-1">
                  GPU 가속
                </Label>
                <Switch
                  id="gpu-acceleration"
                  checked={gpuInfo.acceleration}
                  onCheckedChange={handleToggleAcceleration}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="battery-mode" className="flex-1">
                  배터리 최적화 모드
                </Label>
                <Switch
                  id="battery-mode"
                  checked={batteryMode || (gpuInfo.settings.onBattery || false)}
                  onCheckedChange={handleToggleBatteryMode}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-sm text-muted-foreground">
                <p>GPU 가속 설정을 변경하면 앱을 재시작해야 합니다.</p>
                <p className="mt-2">배터리 최적화 모드는 즉시 적용됩니다.</p>
              </div>
            </CardContent>
          </Card>
          
          {/* GPU 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>하드웨어 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">상태</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={gpuInfo.acceleration ? 'default' : 'outline'}>
                    GPU 가속: {gpuInfo.acceleration ? '활성화' : '비활성화'}
                  </Badge>
                  <Badge variant={gpuInfo.settings.onBattery ? 'secondary' : 'outline'}>
                    전원: {gpuInfo.settings.onBattery ? '배터리' : 'AC 전원'}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">GPU 기능</h3>
                <div className="space-y-2">
                  {gpuInfo.features && Object.entries(gpuInfo.features).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 세부 설정 카드 */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>세부 설정 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gpuInfo.settings && Object.entries(gpuInfo.settings).map(([key, value]) => {
                  if (key === 'timestamp') return null;
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{key}:</span>
                      <span>
                        {typeof value === 'boolean' 
                          ? (value ? '활성화' : '비활성화') 
                          : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">GPU 정보를 불러올 수 없습니다.</p>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={() => window.history.back()}>
          뒤로 가기
        </Button>
      </div>
    </div>
  );
}
