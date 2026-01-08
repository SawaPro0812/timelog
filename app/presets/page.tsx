"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Button, Card, Hr, Input, Label, Msg, Page, Select } from "../../components/ui/ui";
import AppHeader from "../../components/ui/AppHeader";

type Preset = {
  id: string;
  name: string;
  work_mode: "timed" | "manual";
  work_seconds: number | null;
  rest_seconds: number;
  created_at: string;
};

function digitsOnly(s: string) {
  return s.replace(/[^\d]/g, "");
}

export default function PresetsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [items, setItems] = useState<Preset[]>([]);
  const [msg, setMsg] = useState("");

  // form
  const [name, setName] = useState("マイプリセット");
  const [workMode, setWorkMode] = useState<"timed" | "manual">("timed");
  const [workSeconds, setWorkSeconds] = useState("30");
  const [restSeconds, setRestSeconds] = useState("30");

  const isInterval = useMemo(() => workMode === "timed", [workMode]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUserId(uid);
      await refresh();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setMsg("");
    const { data, error } = await supabase
      .from("presets")
      .select("id,name,work_mode,work_seconds,rest_seconds,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(`読み込み失敗: ${error.message}`);
      return;
    }
    setItems((data ?? []) as Preset[]);
  };

  const createPreset = async () => {
    if (!userId) return;
    setMsg("");

    const nm = name.trim();
    const rest = Number(restSeconds || "0");
    const work = Number(workSeconds || "0");

    if (!nm) return setMsg("プリセット名を入力してください。");
    if (rest <= 0) return setMsg("休憩秒数は1以上にしてください。");
    if (workMode === "timed" && work <= 0) return setMsg("トレ秒数は1以上にしてください。");

    const payload = {
      user_id: userId,
      name: nm,
      work_mode: workMode,
      work_seconds: workMode === "timed" ? work : null,
      rest_seconds: rest,
    };

    const { error } = await supabase.from("presets").insert(payload);
    if (error) return setMsg(`作成失敗: ${error.message}`);

    setMsg("作成しました！");
    await refresh();
  };

  const deletePreset = async (id: string) => {
    setMsg("");
    const { error } = await supabase.from("presets").delete().eq("id", id);
    if (error) return setMsg(`削除失敗: ${error.message}`);
    await refresh();
  };

  return (
    <Page>
      <Card>
        <AppHeader title="プリセット" />


        {loading ? (
          <Msg>読み込み中...</Msg>
        ) : (
          <>
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
              }}
            >
              <Label>プリセット名</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />

              <div style={{ marginTop: 10 }}>
                <Label>モード</Label>
              </div>
              <Select value={workMode} onChange={(e) => setWorkMode(e.target.value as any)}>
                <option value="timed">インターバル（トレ+休憩）</option>
                <option value="manual">休憩のみ（セット無制限）</option>
              </Select>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: isInterval ? "1fr 1fr" : "1fr",
                  marginTop: 10,
                }}
              >
                {isInterval && (
                  <div>
                    <Label>トレ（秒）</Label>
                    <Input
                      value={workSeconds}
                      onChange={(e) => setWorkSeconds(digitsOnly(e.target.value))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="30"
                      onBlur={() => {
                        if (workMode === "timed" && workSeconds === "") setWorkSeconds("30");
                      }}
                    />
                  </div>
                )}

                <div>
                  <Label>休憩（秒）</Label>
                  <Input
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(digitsOnly(e.target.value))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="30"
                    onBlur={() => {
                      if (restSeconds === "") setRestSeconds("30");
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <Button onClick={createPreset}>作成</Button>
                <Button variant="ghost" onClick={refresh}>
                  再読み込み
                </Button>
              </div>

              {msg && <Msg>{msg}</Msg>}
            </div>

            <Hr />

            {items.length === 0 ? (
              <Msg>まだプリセットがありません。上で作成してください。</Msg>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((p) => {
                  const modeText =
                    p.work_mode === "timed"
                      ? `インターバル：トレ ${p.work_seconds}s / 休憩 ${p.rest_seconds}s`
                      : `休憩のみ：休憩 ${p.rest_seconds}s（セット無制限）`;

                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(0,0,0,0.18)",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{p.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{modeText}</div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                        <Button variant="ghost" onClick={() => router.push(`/timer/${p.id}`)}>
                          開始
                        </Button>
                        <Button variant="danger" onClick={() => deletePreset(p.id)}>
                          削除
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>
    </Page>
  );
}
