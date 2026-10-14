'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RiArrowRightLine, RiCloseLine, RiLogoutBoxRLine, RiMenuLine, RiUserLine } from 'react-icons/ri';
import { Button } from './ui';

interface NavigationItem { href: string; label: string; icon: ReactNode }
interface Props {
  items: NavigationItem[];
  pathname: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  onLogout: () => Promise<void>;
}

export function isStudentNavActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
}

export default function StudentNavigation({ items, pathname, name, email, avatar, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [pathname]);

  async function logout() {
    setBusy(true);
    setError('');
    try { await onLogout(); }
    catch { setError('Không thể đăng xuất. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }

  const profile = (compact = false) => <Link href="/dashboard/profile"
    aria-current={isStudentNavActive(pathname, '/dashboard/profile') ? 'page' : undefined}
    aria-label={`Hồ sơ của ${name}`} onClick={() => setOpen(false)}
    className={`student-nav-profile ${compact ? 'flex-1' : 'max-w-xs'}`}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light/60 text-sm font-bold text-gray-800">
      {avatar ? <Image src={avatar} alt="" width={40} height={40} className="h-10 w-10 object-cover" /> : name.trim().charAt(0).toUpperCase() || 'H'}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-gray-900">{name}</span>
      <span className="block truncate text-xs text-gray-500">{compact && email ? email : 'Học viên · Hồ sơ cá nhân'}</span>
    </span>
    <RiUserLine aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
  </Link>;

  const links = (mobile = false) => items.map(item => {
    const active = isStudentNavActive(pathname, item.href);
    return <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
      aria-current={active ? 'page' : undefined}
      className={`student-nav-link ${active ? 'student-nav-link-active' : ''} ${mobile ? 'justify-between' : ''}`}>
      <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="shrink-0">{item.icon}</span>
        <span>{item.label === 'Dashboard' ? 'Tổng quan' : item.label === 'Bài Tập' ? 'Bài tập' : item.label}</span>
      </span>
      {mobile && active && <RiArrowRightLine aria-hidden="true" className="h-4 w-4 shrink-0" />}
    </Link>;
  });

  return <header className="student-navigation sticky top-0 z-50" onKeyDown={event => {
    if (event.key === 'Escape' && open) { setOpen(false); toggleRef.current?.focus(); }
  }}>
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
      <div className="flex min-h-[72px] items-center justify-between gap-3 py-3">
        <Link href="/dashboard" aria-label="My Learning - Tổng quan" onClick={() => setOpen(false)} className="student-nav-brand flex min-h-11 min-w-0 items-center gap-3 rounded-xl">
          <Image src="/orange-logo.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" priority />
          <span className="min-w-0"><span className="block text-base font-bold tracking-tight text-gray-900 sm:text-lg">My Learning</span>
            <span className="block text-xs text-gray-500">PTE Intensive</span></span>
        </Link>
        <div className="hidden items-center gap-3 lg:flex">
          {profile()}
          <Button variant="secondary" disabled={busy} onClick={logout} className="inline-flex items-center gap-2 text-sm">
            <RiLogoutBoxRLine aria-hidden="true" className="h-4 w-4" />{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Button>
        </div>
        <button ref={toggleRef} type="button" aria-expanded={open} aria-controls="student-mobile-navigation"
          aria-label={open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'} onClick={() => setOpen(value => !value)}
          className="student-nav-toggle lg:hidden">
          {open ? <RiCloseLine aria-hidden="true" className="h-6 w-6" /> : <RiMenuLine aria-hidden="true" className="h-6 w-6" />}
        </button>
      </div>
      <nav aria-label="Điều hướng học viên" className="hidden items-center gap-2 border-t border-gray-100 py-3 lg:flex">{links()}</nav>
      <div id="student-mobile-navigation" hidden={!open} className="student-nav-mobile border-t border-gray-100 lg:hidden">
        <div className="flex py-4">{profile(true)}</div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Không gian học tập</p>
        <nav aria-label="Điều hướng học viên trên điện thoại" className="grid grid-cols-1 gap-2 sm:grid-cols-2">{links(true)}</nav>
        <div className="mt-4 border-t border-gray-100 py-4">
          <Button variant="secondary" disabled={busy} onClick={logout} className="inline-flex w-full items-center justify-center gap-2 text-sm">
            <RiLogoutBoxRLine aria-hidden="true" className="h-4 w-4" />{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="pb-3 text-sm text-gray-700">{error}</p>}
    </div>
  </header>;
}