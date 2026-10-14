'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/app/firebase/config';
import { LearningAccount, isApproved } from '@/lib/learning-access';
import { learningApi } from '@/lib/learning-api';
import { Button, Card } from '@/components/ui';
import { usePathname } from 'next/navigation';
import { invalidateCache } from '@/lib/client-cache';

const AccountContext = createContext<LearningAccount | null>(null);
export const useLearningAccount = () => useContext(AccountContext);

export default function LearningGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [account, setAccount] = useState<LearningAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let running = false;
    invalidateCache();
    setReady(false);
    setAccount(null);
    const refresh = async () => {
      if (running || status !== 'authenticated') return;
      running = true;
      try {
        const result = await learningApi<{ account: LearningAccount }>('session');
        if (!active) return;
        // Remove any Firebase session left by the former custom-token flow.
        // NextAuth is the sole login session in legacy mode.
        if (auth.currentUser) await firebaseSignOut(auth);
        if (active) { setAccount(result.account); setReady(true); setError(''); }
      } catch (err) {
        if (active) { setReady(false); setError(err instanceof Error ? err.message : 'Không thể kiểm tra quyền truy cập.'); }
      } finally { running = false; }
    };
    if (status === 'unauthenticated') void firebaseSignOut(auth);
    void refresh();
    let lastRefreshAt = Date.now();
    const refreshWhenStale = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefreshAt < 300000) return;
      lastRefreshAt = Date.now();
      void refresh();
    };
    window.addEventListener('focus', refreshWhenStale);
    document.addEventListener('visibilitychange', refreshWhenStale);
    return () => {
      active = false;
      invalidateCache();
      window.removeEventListener('focus', refreshWhenStale);
      document.removeEventListener('visibilitychange', refreshWhenStale);
    };
  }, [status, session?.user?.email, attempt]);

  async function logout() {
    invalidateCache();
    await firebaseSignOut(auth);
    await signOut({ callbackUrl: '/login' });
  }
  if (!ready || !account || !isApproved(account)) return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="space-y-6">
        <h1 className="text-2xl font-bold text-primary">{error ? 'Không thể tải tài khoản' : ready ? 'Tài khoản đang chờ duyệt' : 'Đang kiểm tra tài khoản...'}</h1>
        <p role="status" className="text-gray-600">{error || (ready ? 'Bạn đã đăng nhập thành công. Admin sẽ duyệt quyền học tập của bạn; không cần xếp lớp. Bấm “Kiểm tra lại” sau khi admin duyệt tài khoản.' : 'Vui lòng đợi trong giây lát.')}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setAttempt(value => value + 1)}>Kiểm tra lại</Button>
          <Button variant="secondary" onClick={logout}>Đăng xuất</Button>
        </div>
      </Card>
    </div>
  );
  const staffRoute = /^\/dashboard\/(teacher|assistant|class)(\/|$)/.test(pathname);
  if ((pathname.startsWith('/dashboard/admin') && account.role !== 'admin') || (staffRoute && !['admin', 'teacher', 'assistant'].includes(account.role))) {
    return <Card className="m-6">Bạn không có quyền truy cập trang này. <a href="/dashboard" className="text-primary underline">Về dashboard</a></Card>;
  }
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}