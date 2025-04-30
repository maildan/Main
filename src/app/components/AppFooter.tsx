import React from 'react';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="copyright">
        © {year} loop. All rights reserved.
      </div>
    </footer>
  );
}