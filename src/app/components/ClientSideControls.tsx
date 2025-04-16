'use client';

import React from 'react';

// ClientSideControlsProps 정의
interface ClientSideControlsProps {
  children: React.ReactNode;
}

export default function ClientSideControls({
  children
}: ClientSideControlsProps) {
  return (
    <div className="client-controls-wrapper">
      {children}
    </div>
  );
}
