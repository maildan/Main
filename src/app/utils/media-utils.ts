/**
 * 미디어 관련 유틸리티 함수들
 */

/**
 * 이미지 로드 프로미스
 * @param src 이미지 URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
    img.src = src;
  });
}

/**
 * 이미지 크기 조정 함수
 * @param img 이미지 요소
 * @param maxWidth 최대 너비
 * @param maxHeight 최대 높이
 */
export function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = img.width;
  let height = img.height;
  
  // 비율 계산
  if (width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }
  
  if (height > maxHeight) {
    const ratio = maxHeight / height;
    height = maxHeight;
    width = Math.round(width * ratio);
  }
  
  return { width, height };
}

/**
 * 이미지를 캔버스에 그리고 데이터 URL로 반환
 * @param img 이미지 요소
 * @param width 너비
 * @param height 높이
 * @param format 포맷(image/jpeg, image/png)
 * @param quality JPEG 품질(0-1)
 */
export function imageToDataURL(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.8
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('캔버스 컨텍스트를 생성할 수 없습니다.');
  }
  
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(format, quality);
}

/**
 * 동영상 길이 포맷 함수
 * @param seconds 초 단위 길이
 */
export function formatVideoDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 미디어 마임 타입 확인
 * @param mimeType 마임 타입
 */
export function isMediaMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  );
}

/**
 * 이미지 캐시 유틸리티
 */
export const imageCache = {
  cache: new Map<string, HTMLImageElement>(),
  
  /**
   * 이미지 가져오기 (캐싱 적용)
   * @param src 이미지 URL
   */
  get(src: string): Promise<HTMLImageElement> {
    if (this.cache.has(src)) {
      return Promise.resolve(this.cache.get(src)!);
    }
    
    return loadImage(src).then(img => {
      this.cache.set(src, img);
      return img;
    });
  },
  
  /**
   * 캐시 비우기
   */
  clear(): void {
    this.cache.clear();
  }
};
