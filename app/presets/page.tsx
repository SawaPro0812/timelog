"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { Button, Card, Hr, Input, Label, Msg, Page, Row, Select, Sub, Title } from "../../components/ui/ui";

type Preset = {
  id: string;
  name: string;
  work_mode: "timed" | "manual";
  work_seconds: number | null;
  rest_seconds: number;
  created_at: string;
};

export default function PresetsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [items, setItems] = useState<Preset[]>([]);
  const [msg, setMsg] = useState("");

  // form
  const [name, setName] = useState("マイプリセット");
  const [workMode, setWorkMode] = useState<"timed" | "manual">("timed");
  const [workSeconds, setWorkSeconds] = useState(30);
  const [restSeconds, setRestSeconds] = useState(30);

  const isHIIT = useMemo(() => workMode === "timed", [workMode]);

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

    if (!name.trim()) return setMsg("プリセット名を入力してください。");
    if (restSeconds <= 0) return setMsg("休憩秒数は1以上にしてください。");
    if (workMode === "timed" && workSeconds <= 0) return setMsg("トレ秒数は1以上にしてください（HIIT）。");

    const payload = {
      user_id: userId,
      name: name.trim(),
      work_mode: workMode,
      work_seconds: workMode === "timed" ? workSeconds : null,
      rest_seconds: restSeconds,
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
        <Row>
          <div style={{ flex: 1 }}>
            <Title>プリセット</Title>
            <Sub>HIIT（トレ＋休憩） / ウェイト（休憩のみ・セット無制限）</Sub>
          </div>
          <Link href="/" style={{ color: "#cfe0ff", textDecoration: "none", opacity: 0.9 }}>
            ホーム
          </Link>
        </Row>

        <Hr />

        {loading ? (
          <Msg>読み込み中...</Msg>
        ) : (
          <>
            {/* Create */}
            <Label>プリセット名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />

            <Row>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Label>モード</Label>
                <Select value={workMode} onChange={(e) => setWorkMode(e.target.value as any)}>
                  <option value="timed">HIIT（トレ時間あり）</option>
                  <option value="manual">ウェイト（休憩のみ）</option>
                </Select>
              </div>

              {isHIIT && (
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Label>トレ（秒）</Label>
                  <Input
                    type="number"
                    value={workSeconds}
                    onChange={(e) => setWorkSeconds(Number(e.target.value))}
                    min={1}
                  />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>休憩（秒）</Label>
                <Input
                  type="number"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(Number(e.target.value))}
                  min={1}
                />
              </div>
            </Row>

            <Row>
              <Button onClick={createPreset} style={{ flex: 1 }}>
                作成
              </Button>
              <Button variant="ghost" onClick={refresh} style={{ flex: 1 }}>
                再読み込み
              </Button>
            </Row>

            {msg && <Msg>{msg}</Msg>}

            <Hr />

            {/* List */}
            {items.length === 0 ? (
              <Msg>まだプリセットがありません。上で作成してください。</Msg>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <Row>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800 }}>{p.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                          {p.work_mode === "timed"
                            ? `HIIT：トレ ${p.work_seconds}s / 休憩 ${p.rest_seconds}s`
                            : `ウェイト：休憩 ${p.rest_seconds}s（トレ時間は計測しない）`}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/timer/${p.id}`)}
                        style={{ minWidth: 120 }}
                      >
                        開始
                      </Button>

                      <Button variant="danger" onClick={() => deletePreset(p.id)} style={{ minWidth: 120 }}>
                        削除
                      </Button>
                    </Row>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </Page>
  );
}
