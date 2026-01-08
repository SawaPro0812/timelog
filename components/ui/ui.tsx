"use client";

import * as React from "react";

type ButtonVariant = "default" | "ghost" | "danger";

const styles = {
  page: {
    minHeight: "100svh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    paddingTop: 18,
    paddingBottom: 26,
    background: "linear-gradient(180deg, #0b1020 0%, #070a12 100%)",
    color: "#e8eefc",
  } as React.CSSProperties,

  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  } as React.CSSProperties,

  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  } as React.CSSProperties,

  h1: {
    margin: 0,
    fontWeight: 900,
    fontSize: 24,
    letterSpacing: 0.2,
  } as React.CSSProperties,

  sub: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.8,
  } as React.CSSProperties,

  hr: {
    height: 1,
    background: "rgba(255,255,255,0.12)",
    border: "none",
    margin: "14px 0",
  } as React.CSSProperties,

  label: {
    fontSize: 12,
    opacity: 0.85,
    fontWeight: 800,
    marginBottom: 6,
    display: "block",
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "#e8eefc",
    outline: "none",
    minHeight: 44,
    fontSize: 16, // iPhoneで入力時ズーム回避
  } as React.CSSProperties,

  select: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "#e8eefc",
    outline: "none",
    minHeight: 44,
    fontSize: 16,
  } as React.CSSProperties,

  msg: {
    marginTop: 12,
    fontSize: 12,
    opacity: 0.85,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  } as React.CSSProperties,

  btnBase: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid transparent",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 44,
    fontSize: 16,
    width: "100%",
  } as React.CSSProperties,

  btnDefault: {
    background: "rgba(120,160,255,0.95)",
    color: "#0b1020",
  } as React.CSSProperties,

  btnGhost: {
    background: "rgba(255,255,255,0.08)",
    color: "#e8eefc",
    border: "1px solid rgba(255,255,255,0.14)",
  } as React.CSSProperties,

  // “塗りつぶし赤”→“赤枠+薄い赤背景”で上品に
  btnDanger: {
    background: "rgba(255,99,99,0.08)",
    border: "1px solid rgba(255,99,99,0.45)",
    color: "#ffd0d0",
  } as React.CSSProperties,
};

export function Page({ children }: { children: React.ReactNode }) {
  return <div style={styles.page}>{children}</div>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div style={styles.card}>{children}</div>;
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div style={styles.row}>{children}</div>;
}

export function Hr() {
  return <hr style={styles.hr} />;
}

export function Title({ children, size }: { children: React.ReactNode; size?: number }) {
  // ✅ styles.h1 に依存しつつ、fontSizeは必ずここで上書き（undefined事故を回避）
  const base = styles.h1 ?? ({ margin: 0, fontWeight: 900, fontSize: 24 } as React.CSSProperties);
  return <h1 style={{ ...base, fontSize: size ?? 24 }}>{children}</h1>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <div style={styles.sub}>{children}</div>;
}

export function Msg({ children }: { children: React.ReactNode }) {
  return <div style={styles.msg}>{children}</div>;
}

export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <label style={{ ...styles.label, ...(style ?? {}) }}>{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props;
  return <input {...rest} style={{ ...styles.input, ...(style as any) }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, ...rest } = props;
  return <select {...rest} style={{ ...styles.select, ...(style as any) }} />;
}

export function Button({
  children,
  variant = "default",
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variantStyle =
    variant === "ghost" ? styles.btnGhost : variant === "danger" ? styles.btnDanger : styles.btnDefault;

  return (
    <button
      {...rest}
      style={{
        ...styles.btnBase,
        ...variantStyle,
        ...(style as any),
        opacity: rest.disabled ? 0.6 : 1,
        cursor: rest.disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
