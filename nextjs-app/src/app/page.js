'use client';

import dynamic from 'next/dynamic';

// This component won't be pre-rendered on the server
const ChatApp = dynamic(() => import('./ChatAppComponent'), {
  ssr: false,
});

export default function Page() {
  return <ChatApp />;
}