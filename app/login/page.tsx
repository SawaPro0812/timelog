"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Button, Card, Input, Label, Msg, Page, Row, Sub, Title, Hr } from "../../components/ui/ui";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace("/presets");
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  const validate = () => {
    if (!email.trim()) return "メールアドレスを入力してください。";
    if (!password) return "パスワードを入力してください。";
    if (password.length < 6) return "パスワードは6文字以上にしてください。";
    return "";
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) return setMsg(err);

    setBusy(true);
    setMsg("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setMsg("ログインに失敗しました。メールアドレス/パスワードを確認してください。");
          setBusy(false);
          return;
        }
        router.replace("/presets");
        return;
      }

      // signup
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg("新規登録に失敗しました。入力内容を確認してください。");
        setBusy(false);
        return;
      }

      // Supabase設定によっては確認メールが必要
      setMsg("新規登録を受け付けました。確認メールが届く設定の場合は、メール内リンクを開いてからログインしてください。");
      setMode("login");
      setBusy(false);
    } catch (e: any) {
      setMsg(`エラー: ${e?.message ?? "unknown"}`);
      setBusy(false);
    }
  };

  const SegBtn = ({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: 44,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: active ? "rgba(120,160,255,0.95)" : "rgba(255,255,255,0.08)",
        color: active ? "#0b1020" : "#e8eefc",
        fontWeight: 900,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );

  return (
    <Page>
      <Card>
        <Title size={28}>TimeLog</Title>
        <Sub>インターバル / 休憩タイマーを、最小操作で。</Sub>

        <Hr />

        {loading ? (
          <Msg>読み込み中...</Msg>
        ) : (
          <>
            {/* タブ */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <SegBtn active={mode === "login"} onClick={() => setMode("login")}>
                ログイン
              </SegBtn>
              <SegBtn active={mode === "signup"} onClick={() => setMode("signup")}>
                新規登録
              </SegBtn>
            </div>

            {/* フォーム */}
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <Label>メールアドレス</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  placeholder="example@gmail.com"
                />
              </div>

              <div>
                <Label>パスワード</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="6文字以上"
                />
              </div>

              <Button onClick={onSubmit} disabled={busy}>
                {mode === "login" ? "ログイン" : "新規登録"}
              </Button>

              {msg && <Msg>{msg}</Msg>}
            </div>

            <Hr />

            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.6 }}>
              {mode === "login" ? (
                <>初めての方は「新規登録」から作成できます。</>
              ) : (
                <>登録後、確認メールが必要な設定の場合は、メール内リンクを開いてからログインしてください。</>
              )}
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}
