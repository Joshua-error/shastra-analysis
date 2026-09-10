'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-white font-bold">Redirecting to Dashboard…</div>
    </div>
  );
}
