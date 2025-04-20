import React from 'react';

export default function AppFooter(): React.ReactNode {
  const year = new Date().getFullYear();

  return (
    <footer className="py-4 bg-background border-t border-border">
      <div className="copyright">
        © {year} loop. All rights reserved.
      </div>
    </footer>
  );
}