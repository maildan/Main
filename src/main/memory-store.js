/**
 * 메모리 기반 저장소 모듈
 * electron-store가 실패할 경우 폴백으로 사용됩니다.
 * 모든 데이터는 메모리에만 저장되며 앱이 종료되면 사라집니다.
 */

class MemoryStore {
  constructor(defaults = {}) {
    this.data = { ...defaults };
    console.log('메모리 기반 저장소 초기화됨');
  }

  // 설정 가져오기
  get(key, defaultValue) {
    if (key === undefined) return { ...this.data };
    
    const parts = key.split('.');
    let current = this.data;
    
    for (const part of parts) {
      if (current === undefined || current === null) return defaultValue;
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }

  // 설정 저장
  set(key, value) {
    if (typeof key === 'object') {
      this.data = { ...this.data, ...key };
      return;
    }
    
    const parts = key.split('.');
    const lastIndex = parts.length - 1;
    let current = this.data;
    
    for (let i = 0; i < lastIndex; i++) {
      const part = parts[i];
      if (!(part in current)) current[part] = {};
      current = current[part];
    }
    
    current[parts[lastIndex]] = value;
  }

  // 키 존재 확인
  has(key) {
    const parts = key.split('.');
    let current = this.data;
    
    for (const part of parts) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    
    return current !== undefined;
  }

  // 설정 삭제
  delete(key) {
    const parts = key.split('.');
    const lastIndex = parts.length - 1;
    let current = this.data;
    
    for (let i = 0; i < lastIndex; i++) {
      const part = parts[i];
      if (!(part in current)) return;
      current = current[part];
    }
    
    delete current[parts[lastIndex]];
  }

  // 설정 초기화
  clear() {
    this.data = {};
  }

  // 설정 항목 수
  get size() {
    return Object.keys(this.data).length;
  }

  // 전체 설정 접근 (읽기 전용)
  get store() {
    return { ...this.data };
  }

  // 전체 설정 설정
  set store(value) {
    this.data = { ...value };
  }
}

module.exports = MemoryStore; 