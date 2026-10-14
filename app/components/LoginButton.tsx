"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MOCK_ENABLED, MOCK_ACCOUNTS } from '@/lib/mock/config';
import { Button } from '@/components/ui';

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for error in URL
    const errorType = searchParams?.get('error');
    if (errorType) {
      switch (errorType) {
        case 'ServerConfiguration':
          setError('Sign-in is unavailable because the server cannot access Firebase. Please contact the administrator to check the Firebase service account permissions.');
          break;
        case 'AccessDenied':
          setError('Unable to sign in. Please try again.');
          break;
        case 'DatabaseError':
          setError('The server could not load or create your account. Please try again later or contact the administrator.');
          break;
        case 'Verification':
          setError('Email verification required. Please check your inbox.');
          break;
        default:
          setError('An error occurred during sign in. Please try again.');
      }
      console.error('Login error:', errorType);
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {    
    try {
      setError(null);
      setIsLoading(true);
      
      
      // Direct redirect approach with error handling
      await signIn("google", { 
        callbackUrl: "/dashboard",
        redirect: true,
      });
      
    } catch (error) {
      console.error('Sign in exception:', error);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  if (MOCK_ENABLED) return (
    <div className="space-y-4">
      <p className="text-white/70 text-sm">Chế độ dữ liệu mẫu — đăng nhập local, không dùng Google hoặc Firestore thật.</p>
      {error && <p role="alert" className="text-white">{error}</p>}
      {MOCK_ACCOUNTS.map(account => <Button key={account} disabled={isLoading} className="w-full"
        onClick={async () => {
          setIsLoading(true); setError(null);
          try {
            const result = await signIn('mock', { account, redirect: false, callbackUrl: '/dashboard' });
            if (result?.error || !result?.ok) throw new Error('Không thể đăng nhập demo.');
            window.location.assign('/dashboard');
          } catch { setError('Không thể đăng nhập demo. Hãy kiểm tra server local.'); setIsLoading(false); }
        }}>
        Đăng nhập {({ admin: 'Admin', admin_support: 'Hỗ trợ admin', teacher: 'Giáo viên', assistant: 'Trợ giảng', student: 'Học viên', pending: 'Học viên chờ duyệt' })[account]}
      </Button>)}
    </div>
  );

  return (
    <>
      {error && (
        <div className="p-4 mb-6 text-sm text-red-700 bg-red-100/80 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => {          
          handleGoogleLogin();
        }}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white/10 border border-white/10 rounded-2xl text-white font-medium hover:bg-white/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{isLoading ? "Connecting..." : "Sign in with Google"}</span>
      </button>
    </>
  );
}
