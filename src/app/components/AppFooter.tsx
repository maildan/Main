import React from 'react';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="copyright">
        © {year} 타이핑 통계 앱
      </div>
    </footer>
  );
}