import 'react';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
    WebkitTapHighlightColor?: string;
    WebkitAppearance?: string;
  }
}
