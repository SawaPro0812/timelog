"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { Button, Card, Hr, Input, Label, Msg, Page, Row, Sub, Title } from "../../components/ui/ui";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const router = useRouter();


  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    })();
  }, []);

  const signUp = async () => {
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? `登録失敗: ${error.message}` : "登録しました。続けてログインしてください。");

  };

  const signIn = async () => {
    setMsg("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(`ログイン失敗: ${error.message}`);

    setUserEmail(data.user?.email ?? null);
    setMsg("ログインしました。移動します…");
    router.replace("/presets");
  };

  const signOut = async () => {
    setMsg("");
    await supabase.auth.signOut();
    setUserEmail(null);
    setMsg("ログアウトしました");
  };

  return (
    <Page>
      <Card>
        <Row>
          <div style={{ flex: 1 }}>
            <Title>TimeLog</Title>
            <Sub>Interval timer & logs</Sub>
          </div>
          <Link href="/" style={{ color: "#cfe0ff", textDecoration: "none", opacity: 0.9 }}>
            Home
          </Link>
        </Row>

        <Hr />

        {userEmail ? (
          <>
            <Msg>
              Logged in as: <b>{userEmail}</b>
            </Msg>
            <Button variant="ghost" onClick={signOut}>
              Sign out
            </Button>
            {msg && <Msg>{msg}</Msg>}
          </>
        ) : (
          <>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

            <Label>Password</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
            />

            <Row>
              <Button onClick={signIn} style={{ flex: 1 }}>
                Sign in
              </Button>
              <Button variant="ghost" onClick={signUp} style={{ flex: 1 }}>
                Sign up
              </Button>
            </Row>

            {msg && <Msg>{msg}</Msg>}
          </>
        )}
      </Card>
    </Page>
  );
}
