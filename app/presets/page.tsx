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

const DEFAULT_NAME = "マイプリセット";
const DEFAULT_MODE: "timed" | "manual" = "timed";
const DEFAULT_WORK = "30";
const DEFAULT_REST = "30";

export default function PresetsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [items, setItems] = useState<Preset[]>([]);
  const [msg, setMsg] = useState("");

  // form
  const [name, setName] = useState(DEFAULT_NAME);
  const [workMode, setWorkMode] = useState<"timed" | "manual">(DEFAULT_MODE);
  const [workSeconds, setWorkSeconds] = useState(DEFAULT_WORK);
  const [restSeconds, setRestSeconds] = useState(DEFAULT_REST);

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

  const resetForm = () => {
    setName(DEFAULT_NAME);
    setWorkMode(DEFAULT_MODE);
    setWorkSeconds(DEFAULT_WORK);
    setRestSeconds(DEFAULT_REST);
    setMsg("リセットしました");
  };

  const toInt = (s: string) => {
    const n = parseInt(s || "0", 10);
    return Number.isFinite(n) ? n : 0;
  };

  const createPreset = async () => {
    if (!userId) return;

    const rest = toInt(restSeconds);
    const work = toInt(workSeconds);

    if (!name.trim()) return setMsg("プリセット名を入力してください。");
    if (rest <= 0) return setMsg("休憩秒数は1以上にしてください。");
    if (workMode === "timed" && work <= 0) return setMsg("トレ秒数は1以上にしてください。");

    const payload = {
      user_id: userId,
      name: name.trim(),
      work_mode: workMode,
      work_seconds: workMode === "timed" ? work : null,
      rest_seconds: rest,
    };

    const { error } = await supabase.from("presets").insert(payload);
    if (error) return setMsg(`作成失敗: ${error.message}`);

    setMsg("作成しました");
    await refresh();
  };

  const deletePreset = async (id: string) => {
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

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isInterval ? "1fr 1fr" : "1fr", marginTop: 10 }}>
                {isInterval && (
                  <div>
                    <Label>トレ（秒）</Label>
                    <Input
                      value={workSeconds}
                      onChange={(e) => setWorkSeconds(e.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="30"
                    />
                  </div>
                )}

                <div>
                  <Label>休憩（秒）</Label>
                  <Input
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="30"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <Button onClick={createPreset}>作成</Button>
                <Button variant="ghost" onClick={resetForm}>
                  リセット
                </Button>
              </div>

              <div style={{ minHeight: 54, marginTop: 10 }}>
                {msg ? (
                  <>
                    <Hr />
                    <Msg>{msg}</Msg>
                  </>
                ) : (
                  <div style={{ opacity: 0 }}>
                    <Hr />
                    <Msg>placeholder</Msg>
                  </div>
                )}
              </div>
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
