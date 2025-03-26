'use client';

import { TypingAnalyzer } from './TypingAnalyzer';
import type { ComponentProps } from 'react';

// TypingAnalyzer의 props 타입을 재사용
type TypingAnalyzerProps = ComponentProps<typeof TypingAnalyzer>;

// 단순 래퍼 컴포넌트
export default function TypingAnalyzerWrapper(props: TypingAnalyzerProps) {
  return <TypingAnalyzer {...props} />;
}
