"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { Button, Card, Hr, Msg, Page, Row, Sub, Title } from "../../components/ui/ui";

type SessionRow = {
  id: string;
  preset_id: string | null;
  started_at: string;
  ended_at: string | null;
  sets_completed: number;
  total_rest_seconds: number;
  total_work_seconds: number;
  created_at: string;
  presets?: { name: string } | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}
function dt(iso: string) {
  const d = new Date(iso);
  // 日本向けにざっくり
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

export default function SessionsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SessionRow[]>([]);
  const [msg, setMsg] = useState("");

  const refresh = async () => {
    setMsg("");
    setLoading(true);

    // presets を joinして name を取る（Foreign key: sessions.preset_id -> presets.id）
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id,preset_id,started_at,ended_at,sets_completed,total_rest_seconds,total_work_seconds,created_at,presets(name)"
      )
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      setMsg(`読み込み失敗: ${error.message}`);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCount = useMemo(() => items.length, [items]);

  const deleteSession = async (id: string) => {
    setMsg("");
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) return setMsg(`削除失敗: ${error.message}`);
    await refresh();
  };

  return (
    <Page>
      <Card>
        <Row>
          <div style={{ flex: 1 }}>
            <Title>履歴</Title>
            <Sub>直近{totalCount}件（最大50件）</Sub>
          </div>
          <Link href="/" style={{ color: "#cfe0ff", textDecoration: "none", opacity: 0.9 }}>
            ホーム
          </Link>
        </Row>

        <Hr />

        <Row>
          <Button onClick={refresh} variant="ghost" style={{ flex: 1 }}>
            再読み込み
          </Button>
          <Link
            href="/presets"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#e8eefc",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            プリセットへ
          </Link>
        </Row>

        {msg && <Msg>{msg}</Msg>}

        <Hr />

        {loading ? (
          <Msg>読み込み中...</Msg>
        ) : items.length === 0 ? (
          <Msg>まだ履歴がありません。タイマーを回して「終了して保存」してください。</Msg>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((s) => {
              const name = s.presets?.name ?? "（削除済みプリセット）";
              const duration = s.ended_at
                ? Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000))
                : null;

              return (
                <div
                  key={s.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.18)",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                    開始: {dt(s.started_at)}
                    {s.ended_at ? ` / 終了: ${dt(s.ended_at)}` : " / 終了: （未終了）"}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                    セット: <b>{s.sets_completed}</b> ／ 休憩合計: <b>{fmt(s.total_rest_seconds)}</b> ／ トレ合計:{" "}
                    <b>{fmt(s.total_work_seconds)}</b>
                    {duration !== null && (
                      <>
                        {" "}
                        ／ 経過: <b>{fmt(duration)}</b>
                      </>
                    )}
                  </div>

                  <Row>
                    {s.preset_id && (
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/timer/${s.preset_id}`)}
                        style={{ flex: 1 }}
                      >
                        このプリセットで開始
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => deleteSession(s.id)} style={{ flex: 1 }}>
                      履歴を削除
                    </Button>
                  </Row>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </Page>
  );
}
