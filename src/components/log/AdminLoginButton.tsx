'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginButton() {
  const { user, isAdmin, loading, signInWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <div className="text-[0.68rem] text-[var(--atr-muted)]">
        ...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-[0.45rem]">
        {isAdmin && (
          <span className="rounded-full bg-[rgba(232,169,186,0.12)] px-[0.42rem] py-[0.12rem] text-[0.64rem] text-[var(--atr-accent)]">
            Admin
          </span>
        )}
        <button
          onClick={logout}
          className="text-[0.68rem] text-[var(--atr-muted)] transition-colors hover:text-[var(--atr-text)]"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="inline-flex w-fit items-center rounded-[0.25rem] border border-[rgba(38,50,60,0.12)] bg-white/30 px-[0.42rem] py-[0.16rem] text-[0.68rem] text-[var(--atr-muted)] transition-colors hover:bg-white/50 hover:text-[var(--atr-text)]"
    >
      로그인
    </button>
  );
}
