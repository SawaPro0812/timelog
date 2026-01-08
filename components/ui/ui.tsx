import React from "react";

export function Page({ children }: { children: React.ReactNode }) {
  return <main style={styles.page}>{children}</main>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div style={styles.card}>{children}</div>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 style={styles.h1}>{children}</h1>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <p style={styles.sub}>{children}</p>;
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div style={styles.row}>{children}</div>;
}

export function Hr() {
  return <div style={styles.hr} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label style={styles.label}>{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...styles.input, ...(props.style ?? {}) }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...styles.input, ...(props.style ?? {}) }} />;
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const v =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "danger"
      ? styles.btnDanger
      : styles.btnGhost;

  return (
    <button {...props} style={{ ...styles.btn, ...v, ...(props.style ?? {}) }}>
      {children}
    </button>
  );
}

export function Msg({ children }: { children: React.ReactNode }) {
  return <p style={styles.msg}>{children}</p>;
}

export const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100svh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    paddingTop: 20,
    paddingBottom: 28,
    background: "linear-gradient(180deg, #0b1020 0%, #070a12 100%)",
    color: "#e8eefc",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  btn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid transparent",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 44, // iPhoneで押しやすい最低ライン
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "#e8eefc",
    outline: "none",
    minHeight: 44,
  },
  btnPrimary: { background: "#4f7cff", color: "#081022" },
  btnGhost: { background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#e8eefc" },
  btnDanger: { background: "rgba(255,99,99,0.18)", border: "1px solid rgba(255,99,99,0.35)", color: "#ffd2d2" },
  msg: { marginTop: 12, fontSize: 13, opacity: 0.9, whiteSpace: "pre-wrap" },
};
