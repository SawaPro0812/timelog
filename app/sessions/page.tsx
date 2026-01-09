"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Button, Card, Msg, Page, Sub } from "../../components/ui/ui";
import AppHeader from "../../components/ui/AppHeader";

type SessionRow = {
  id: string;
  preset_id: string | null;
  started_at: string;
  ended_at: string | null;
  sets_completed: number;
  total_rest_seconds: number;
  total_work_seconds: number;
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
function dt(s: string) {
  const d = new Date(s);
  const y = d.getFullYear();
  const mo = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}/${mo}/${da} ${hh}:${mm}`;
}

export default function SessionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SessionRow[]>([]);
  const [msg, setMsg] = useState("");

  const refresh = async () => {
    setMsg("");
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id,preset_id,started_at,ended_at,sets_completed,total_rest_seconds,total_work_seconds,presets(name)"
      )
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      setMsg(`読み込み失敗: ${error.message}`);
      return;
    }
    setItems((data ?? []) as any);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      await refresh();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteSession = async (id: string) => {
    setMsg("");
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) return setMsg(`削除失敗: ${error.message}`);
    await refresh();
  };

  return (
    <Page>
      <Card>
        <AppHeader title="履歴" />

        {loading ? (
          <Msg>読み込み中...</Msg>
        ) : (
          <>
            <Sub>直近{Math.min(items.length, 50)}件（最大50件）</Sub>

            {msg && <Msg>{msg}</Msg>}

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {items.length === 0 ? (
                <Msg>まだ履歴がありません。</Msg>
              ) : (
                items.map((s) => {
                  const presetName = s.presets?.name ?? "（削除済みプリセット）";
                  const start = dt(s.started_at);
                  const end = s.ended_at ? dt(s.ended_at) : "—";

                  const elapsed =
                    s.ended_at ? Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)) : 0;

                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(0,0,0,0.18)",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{presetName}</div>
                      <div style={{ fontSize: 12, opacity: 0.78, marginTop: 6 }}>
                        開始: {start} / 終了: {end}
                      </div>

                      {/* ✅ ここをnowrap塊でwrapさせる */}
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          opacity: 0.9,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <span style={{ whiteSpace: "nowrap" }}>
                          セット: <b>{s.sets_completed}</b>
                        </span>
                        <span style={{ whiteSpace: "nowrap" }}>
                          休憩合計: <b>{fmt(s.total_rest_seconds)}</b>
                        </span>
                        <span style={{ whiteSpace: "nowrap" }}>
                          トレ合計: <b>{fmt(s.total_work_seconds)}</b>
                        </span>
                        <span style={{ whiteSpace: "nowrap" }}>
                          経過: <b>{fmt(elapsed)}</b>
                        </span>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <Button variant="danger" onClick={() => deleteSession(s.id)}>
                          削除
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}
