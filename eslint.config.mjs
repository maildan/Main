// 이 파일은 .eslintrc.js 파일로 설정이 통합되었습니다.
// 프로젝트에서 플랫 구성 포맷을 사용하려는 경우에만 이 파일을 활용하세요.
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    extends: ["./.eslintrc.js"],
  },
});

// 무시할 파일 패턴 설정 (.eslintignore 대체)
const ignores = [
  'node_modules/**',
  '.next/**',
  'out/**',
  'dist/**',
  'build/**',
  'native-modules/**',
  '*.config.js',
  '*.config.mjs',
  '*.json',
  '*.lock',
  '.github/**',
  '.vscode/**',
  'public/**'
];

// 빈 구성 경고 제거를 위해 빈 객체 대신 설정된 구성 내보내기
export default [
  ...compat.config(),
  {
    ignores,
    // 추가 설정이 필요한 경우 여기에 작성
  }
];
