'use client';

import React, { Suspense } from 'react';
import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';

interface ClientLayoutProps {
  children: ReactNode;
}

const ClientLayoutComponent: React.FC<ClientLayoutProps> = ({ children }): React.ReactNode => {
  // Client-side specific logic or state can go here
  return (
    <Suspense fallback={<div>Loading client components...</div>}>
      <ThemeProvider>{children}</ThemeProvider>
    </Suspense>
  );
};

export default ClientLayoutComponent;