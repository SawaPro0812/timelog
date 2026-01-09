"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabaseClient";

type Props = { title: string };

export default function AppHeader({ title }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal用：CSRでのみbodyを使う
  useEffect(() => setMounted(true), []);

  // ESCで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 画面遷移したら閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ✅ 開いている間は背景スクロールをロック（html + body）
  useEffect(() => {
    if (!open) return;

    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const MenuItem = ({ href, label, active }: { href: string; label: string; active: boolean }) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      style={{
        display: "block",
        padding: "16px 16px",
        borderRadius: 14,
        border: active ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
        color: "#e8eefc",
        fontWeight: 900,
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,

        display: "grid",
        placeItems: "center",

        padding: "max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))",

        width: "100vw",
        height: "100dvh",

        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          margin: "0 auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(10,14,22,0.92)",
          padding: 14,
          boxShadow: "0 16px 50px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>メニュー</div>

        <div style={{ display: "grid", gap: 10 }}>
          <MenuItem href="/presets" label="プリセット" active={pathname === "/presets"} />
          <MenuItem href="/sessions" label="履歴" active={pathname === "/sessions"} />

          <button
            type="button"
            onClick={logout}
            style={{
              width: "100%",
              padding: "16px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.06)",
              color: "#ffd6d6",
              fontWeight: 900,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            ログアウト
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8eefc",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 0.5 }}>{title}</div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="menu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "#e8eefc",
            fontWeight: 900,
            cursor: "pointer",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          MENU
          <span style={{ opacity: 0.9, fontSize: 18, lineHeight: 1 }}>≡</span>
        </button>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 14 }} />

      {open && mounted && createPortal(overlay, document.body)}
    </>
  );
}
