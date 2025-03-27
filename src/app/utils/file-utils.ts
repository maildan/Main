/**
 * 파일 관련 유틸리티 함수
 */

import { formatBytes } from './common-utils';

/**
 * 파일 확장자를 추출합니다.
 * @param filename - 파일 이름
 * @returns 확장자 (점 포함)
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.slice(lastDotIndex);
}

/**
 * 파일 이름에서 확장자를 제외한 부분을 반환합니다.
 * @param filename - 파일 이름
 * @returns 확장자를 제외한 파일 이름
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return filename;
  return filename.slice(0, lastDotIndex);
}

/**
 * 파일명 추출 함수
 * @param path 파일 경로
 */
export function getFileName(path: string): string {
  return path.replace(/^.*[\\\/]/, '');
}

/**
 * 파일을 Blob URL로 변환
 * @param file File 객체
 */
export function fileToUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Blob URL 정리 함수
 * @param url 정리할 Blob URL
 */
export function cleanupFileUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * 파일 MIME 유형에 따른 카테고리 확인
 * @param mimeType 파일의 MIME 타입
 */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/rtf'
  ];
  
  if (documentTypes.includes(mimeType)) return 'document';
  
  return 'other';
}

/**
 * 브라우저에서 파일 다운로드 함수
 * @param url 다운로드할 파일 URL
 * @param filename 저장할 파일명
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 파일 내용 읽기 함수
 * @param file 파일 객체
 */
export function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('파일을 읽을 수 없습니다.'));
      }
    };
    
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsText(file);
  });
}

/**
 * 파일 크기 정보를 반환합니다.
 * @param sizeInBytes - 파일 크기 (바이트)
 * @returns 파일 크기 정보 문자열
 */
export function getFileSizeInfo(sizeInBytes: number): string {
  return `파일 크기: ${formatBytes(sizeInBytes)}`;
}
