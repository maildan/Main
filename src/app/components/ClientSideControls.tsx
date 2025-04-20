'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import WindowControls from '@/app/components/WindowControls';

// useIsClient 훅 정의
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
};

// ClientSideControlsProps 정의
interface ClientSideControlsProps {
  children: ReactNode;
}

const ClientSideControls: React.FC<ClientSideControlsProps> = ({
  children
}: ClientSideControlsProps): React.ReactNode => {
  const isClient = useIsClient();

  return (
    <div className="client-controls-wrapper">
      {isClient && <WindowControls />}
      {children}
    </div>
  );
};

export default ClientSideControls;
