/**
 * 경로 관련 유틸리티 함수들
 */

/**
 * 파일 경로에서 확장자 추출
 * @param path 파일 경로
 */
export function getExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * 파일 경로에서 파일명(확장자 제외) 추출
 * @param path 파일 경로
 */
export function getBaseName(path: string): string {
  const filename = path.split(/[\\/]/).pop() || '';
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
}

/**
 * 파일 경로에서 디렉토리 경로 추출
 * @param path 파일 경로
 */
export function getDirName(path: string): string {
  return path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
}

/**
 * 경로 결합 함수
 * @param parts 결합할 경로 부분들
 */
export function joinPath(...parts: string[]): string {
  // 경로 구분자를 정규화하고 중복 구분자 제거
  return parts
    .map((part, i) => {
      if (i === 0) {
        // 첫 부분의 끝 구분자 제거
        return part.replace(/[/\\]$/, '');
      } else if (i === parts.length - 1) {
        // 마지막 부분의 시작 구분자 제거
        return part.replace(/^[/\\]/, '');
      } else {
        // 중간 부분의 시작 및 끝 구분자 제거
        return part.replace(/^[/\\]/, '').replace(/[/\\]$/, '');
      }
    })
    .filter(Boolean) // 빈 문자열 제거
    .join('/');
}

/**
 * 경로 정규화 함수
 * @param path 정규화할 경로
 */
export function normalizePath(path: string): string {
  // 연속된 구분자를 단일 구분자로 변경
  const normalized = path.replace(/[/\\]+/g, '/');
  
  // './' 제거
  const withoutDotSlash = normalized.replace(/\/\.\//g, '/');
  
  // 상위 디렉토리 참조 처리
  const parts = withoutDotSlash.split('/');
  const result: string[] = [];
  
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else if (part !== '.' && part !== '') {
      result.push(part);
    }
  }
  
  return result.join('/');
}

/**
 * 상대 경로 계산 함수
 * @param from 시작 경로
 * @param to 대상 경로
 */
export function relativePath(from: string, to: string): string {
  // 경로 정규화
  const normalizedFrom = normalizePath(from);
  const normalizedTo = normalizePath(to);
  
  // 공통 부분 계산
  const fromParts = normalizedFrom.split('/');
  const toParts = normalizedTo.split('/');
  
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }
  
  // 상위 디렉토리로 이동하는 경로 구성
  const upCount = fromParts.length - i;
  const upPath = Array(upCount).fill('..').join('/');
  
  // 대상 경로의 나머지 부분
  const targetPath = toParts.slice(i).join('/');
  
  // 결합
  if (!upPath && !targetPath) {
    return '.';
  }
  
  if (!upPath) {
    return targetPath;
  }
  
  if (!targetPath) {
    return upPath;
  }
  
  return `${upPath}/${targetPath}`;
}

/**
 * 파일 경로가 특정 확장자인지 확인
 * @param path 파일 경로
 * @param extensions 확인할 확장자 배열
 */
export function hasExtension(path: string, extensions: string[]): boolean {
  const ext = getExtension(path);
  return extensions.some(e => e.toLowerCase() === ext.toLowerCase());
}
