"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Title } from "./ui";

function IconMenuIOS() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 7h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 12h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 17h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 6.5l11 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function AppHeader({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        style={{
          display: "block",
          width: "100%",
          padding: "12px 12px",
          borderRadius: 14,
          textDecoration: "none",
          textAlign: "left",
          color: active ? "#e8eefc" : "rgba(232,238,252,0.88)",
          background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontWeight: 850,
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div>
      {/* タイトル + メニューボタン */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Title size={28}>{title}</Title>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="メニュー"
          style={{
            height: 44,
            padding: "0 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.08)",
            color: "#e8eefc",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, letterSpacing: 0.5 }}>MENU</span>
          <span style={{ display: "grid", placeItems: "center" }}>{open ? <IconClose /> : <IconMenuIOS />}</span>
        </button>
      </div>

      {/* 余白＋区切り */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.12)",
          marginTop: 12,
          marginBottom: 14,
        }}
      />

      {/* ドロワー */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 50,
          }}
        >
          <div
            ref={panelRef}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: "min(340px, calc(100vw - 28px))",
              borderRadius: 18,
              padding: 12,
              background: "rgba(15,18,28,0.96)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>メニュー</div>

            <div style={{ display: "grid", gap: 10 }}>
              <NavLink href="/presets" label="プリセット" />
              <NavLink href="/sessions" label="履歴" />

              <button
                type="button"
                onClick={logout}
                style={{
                  width: "100%",
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,99,99,0.45)",
                  background: "rgba(255,99,99,0.08)",
                  color: "#ffd0d0",
                  fontWeight: 900,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
