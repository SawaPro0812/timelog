"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { Button, Card, Hr, Msg, Page, Row, Sub, Title } from "../../../components/ui/ui";

type Preset = {
  id: string;
  name: string;
  work_mode: "timed" | "manual";
  work_seconds: number | null;
  rest_seconds: number;
};

type Phase = "idle" | "work" | "rest";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

export default function TimerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const presetId = params.id;

  const [preset, setPreset] = useState<Preset | null>(null);
  const [msg, setMsg] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  // session states (DB連動)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [sets, setSets] = useState(0);
  const [totalRest, setTotalRest] = useState(0);
  const [totalWork, setTotalWork] = useState(0);

  const setsRef = useRef(0);
  const totalRestRef = useRef(0);
  const totalWorkRef = useRef(0);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  useEffect(() => {
    setsRef.current = sets;
  }, [sets]);
  useEffect(() => {
    totalRestRef.current = totalRest;
  }, [totalRest]);
  useEffect(() => {
    totalWorkRef.current = totalWork;
  }, [totalWork]);

  // timer states
  const [phase, setPhase] = useState<Phase>("idle");
  const [remain, setRemain] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const remainRef = useRef<number>(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    remainRef.current = remain;
  }, [remain]);

  const isHIIT = useMemo(() => preset?.work_mode === "timed", [preset]);
  const workSec = useMemo(() => preset?.work_seconds ?? 0, [preset]);
  const restSec = useMemo(() => preset?.rest_seconds ?? 0, [preset]);

  const stopTick = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTick = () => {
    stopTick();
    intervalRef.current = window.setInterval(() => {
      setRemain((prev) => {
        if (prev <= 1) {
          onPhaseFinished();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const beep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // ignore
    }
  };

  // --- DB helpers ---
  const createSession = async () => {
    if (!userId) throw new Error("userId missing");
    if (!preset) throw new Error("preset missing");

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        preset_id: preset.id,
        // started_at は default now()
        sets_completed: 0,
        total_rest_seconds: 0,
        total_work_seconds: 0,
      })
      .select("id")
      .single();

    if (error) throw error;
    const id = (data as any).id as string;
    setSessionId(id);
    sessionIdRef.current = id;
    return id;
  };

  const updateSession = async (id: string, patch: Record<string, any>) => {
    const { error } = await supabase.from("sessions").update(patch).eq("id", id);
    if (error) throw error;
  };

  const finishSession = async () => {
    const id = sessionIdRef.current;
    if (!id) return;

    await updateSession(id, {
      ended_at: new Date().toISOString(),
      sets_completed: setsRef.current,
      total_rest_seconds: totalRestRef.current,
      total_work_seconds: totalWorkRef.current,
    });

    setMsg("セッションを保存しました。");
    setSessionId(null);
    sessionIdRef.current = null;
  };

  // phase end handler (重要：ここで加算＆DB更新)
  const onPhaseFinished = async () => {
    beep();
    if (!preset) return;

    const currentPhase = phaseRef.current;
    const sid = sessionIdRef.current;

    try {
      if (currentPhase === "work") {
        // HIIT: work終了 → work秒数を加算 → restへ
        if (isHIIT) {
          setTotalWork((x) => x + workSec);
          if (sid) {
            await updateSession(sid, {
              total_work_seconds: totalWorkRef.current + workSec,
            });
            totalWorkRef.current = totalWorkRef.current + workSec;
          }
        }

        setPhase("rest");
        setRemain(restSec);
        startTick();
        return;
      }

      if (currentPhase === "rest") {
        // rest終了 → rest秒数を加算 & セット数+1
        const newSets = setsRef.current + 1;
        const newTotalRest = totalRestRef.current + restSec;

        setSets(newSets);
        setTotalRest(newTotalRest);

        setsRef.current = newSets;
        totalRestRef.current = newTotalRest;

        if (sid) {
          await updateSession(sid, {
            sets_completed: newSets,
            total_rest_seconds: newTotalRest,
          });
        }

        if (isHIIT) {
          // 次のworkへ
          setPhase("work");
          setRemain(workSec);
          startTick();
        } else {
          // ウェイト：次セットは手動（idle）
          setPhase("idle");
          setRemain(0);
          stopTick();
        }
        return;
      }
    } catch (e: any) {
      setMsg(`保存更新エラー: ${e?.message ?? "unknown"}`);
    }
  };

  // load preset
  useEffect(() => {
    (async () => {
      setMsg("");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }
      setUserId(u.user.id);

      const { data, error } = await supabase
        .from("presets")
        .select("id,name,work_mode,work_seconds,rest_seconds")
        .eq("id", presetId)
        .single();

      if (error) return setMsg(`プリセット取得失敗: ${error.message}`);
      setPreset(data as Preset);
    })();

    return () => stopTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  // actions
  const start = async () => {
    if (!preset) return;
    setMsg("");

    // 既存セッションがあれば終了扱いにする（迷子防止）
    if (sessionIdRef.current) {
      await finishSession();
    }

    // local reset
    setSets(0);
    setTotalRest(0);
    setTotalWork(0);
    setsRef.current = 0;
    totalRestRef.current = 0;
    totalWorkRef.current = 0;

    // create session
    try {
      await createSession();
    } catch (e: any) {
      setMsg(`セッション開始失敗: ${e?.message ?? "unknown"}`);
      return;
    }

    if (isHIIT) {
      setPhase("work");
      setRemain(workSec);
      startTick();
    } else {
      setPhase("idle");
      setRemain(0);
      stopTick();
      setMsg("セットが終わったら「休憩スタート」を押してください。");
    }
  };

  const pause = () => {
    setMsg("");
    stopTick();
  };

  const resume = () => {
    setMsg("");
    if (phaseRef.current === "work" || phaseRef.current === "rest") startTick();
  };

  const resetLocalOnly = () => {
    setMsg("");
    stopTick();
    setPhase("idle");
    setRemain(0);
    setSets(0);
    setTotalRest(0);
    setTotalWork(0);
    setsRef.current = 0;
    totalRestRef.current = 0;
    totalWorkRef.current = 0;
  };

  const endAndSave = async () => {
    setMsg("");
    stopTick();
    setPhase("idle");
    setRemain(0);
    await finishSession();
  };

  const startRestManual = () => {
    if (!preset) return;
    if (!sessionIdRef.current) {
      // 念のため
      setMsg("先に「スタート」を押してください。");
      return;
    }
    setMsg("");
    setPhase("rest");
    setRemain(restSec);
    startTick();
  };

  const skip = () => {
    setMsg("");
    stopTick();
    onPhaseFinished();
  };

  const phaseLabel = useMemo(() => {
    if (!preset) return "";
    if (phase === "work") return "トレーニング";
    if (phase === "rest") return "休憩";
    return isHIIT ? "待機" : "セット中（手動）";
  }, [phase, isHIIT, preset]);

  return (
    <Page>
      <Card>
        <Row>
          <div style={{ flex: 1 }}>
            <Title>タイマー</Title>
            <Sub>{preset ? preset.name : "読み込み中..."}</Sub>
          </div>
          <Link href="/presets" style={{ color: "#cfe0ff", textDecoration: "none", opacity: 0.9 }}>
            プリセット
          </Link>
        </Row>

        <Hr />

        {!preset ? (
          <Msg>{msg || "Loading..."}</Msg>
        ) : (
          <>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8 }}>{phaseLabel}</div>
              <div style={{ fontSize: 42, fontWeight: 900, marginTop: 6 }}>
                {phase === "work" || phase === "rest" ? fmt(remain) : "--:--"}
              </div>

              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                セット数: <b>{sets}</b>（無制限）
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
                休憩合計: <b>{fmt(totalRest)}</b> ／ トレ合計: <b>{fmt(totalWork)}</b>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
                {isHIIT
                  ? `HIIT：トレ ${workSec}s / 休憩 ${restSec}s`
                  : `ウェイト：休憩 ${restSec}s（トレ時間は計測しない）`}
              </div>

              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>
                セッション: {sessionId ? "記録中" : "未開始"}
              </div>
            </div>

            <Row>
              <Button onClick={start} style={{ flex: 1 }}>
                スタート（記録開始）
              </Button>
              <Button variant="ghost" onClick={resetLocalOnly} style={{ flex: 1 }}>
                表示リセット（保存しない）
              </Button>
            </Row>

            <Row>
              <Button variant="ghost" onClick={pause} style={{ flex: 1 }}>
                一時停止
              </Button>
              <Button variant="ghost" onClick={resume} style={{ flex: 1 }}>
                再開
              </Button>
            </Row>

            <Row>
              {preset.work_mode === "manual" ? (
                <Button onClick={startRestManual} style={{ flex: 1 }}>
                  休憩スタート
                </Button>
              ) : (
                <Button variant="ghost" onClick={skip} style={{ flex: 1 }}>
                  次へ（スキップ）
                </Button>
              )}
            </Row>

            <Row>
              <Button variant="danger" onClick={endAndSave} style={{ flex: 1 }}>
                終了して保存
              </Button>
            </Row>

            {msg && <Msg>{msg}</Msg>}
          </>
        )}
      </Card>
    </Page>
  );
}
