"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Button, Card, Hr, Msg, Page, Sub } from "../../../components/ui/ui";
import AppHeader from "../../../components/ui/AppHeader";

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
  const [userId, setUserId] = useState<string | null>(null);

  const [msg, setMsg] = useState("");

  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const startedAtRef = useRef<Date | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [remain, setRemain] = useState(0);

  const [sets, setSets] = useState(0);
  const [totalRest, setTotalRest] = useState(0);
  const [totalWork, setTotalWork] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  const isInterval = useMemo(() => preset?.work_mode === "timed", [preset]);
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

  const announcePhaseStart = (p: Phase) => {
    if (p === "work") setMsg("トレーニング開始");
    if (p === "rest") setMsg("休憩開始");
  };

  const onPhaseFinished = () => {
    if (!preset) return;

    beep();

    const current = phaseRef.current;

    if (current === "work") {
      setTotalWork((v) => v + workSec);
      setPhase("rest");
      setRemain(restSec);
      startTick();
      announcePhaseStart("rest");
      return;
    }

    if (current === "rest") {
      setTotalRest((v) => v + restSec);
      setSets((v) => v + 1);

      if (isInterval) {
        setPhase("work");
        setRemain(workSec);
        startTick();
        announcePhaseStart("work");
      } else {
        setPhase("idle");
        setRemain(0);
        stopTick();
      }
      return;
    }
  };

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

      if (error) {
        setMsg(`プリセット取得失敗: ${error.message}`);
        return;
      }
      setPreset(data as Preset);
    })();

    return () => stopTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  const startRun = () => {
    if (!preset) return;

    const now = new Date();
    setStartedAt(now);
    startedAtRef.current = now;

    setSets(0);
    setTotalRest(0);
    setTotalWork(0);

    if (isInterval) {
      setPhase("work");
      setRemain(workSec);
      startTick();
      setMsg("開始しました");
    } else {
      setPhase("idle");
      setRemain(0);
      stopTick();
      setMsg("開始しました（セットが終わったら「休憩スタート」）");
    }
  };

  const resetRun = () => {
    stopTick();
    setStartedAt(null);
    startedAtRef.current = null;

    setPhase("idle");
    setRemain(0);
    setSets(0);
    setTotalRest(0);
    setTotalWork(0);

    setMsg("リセットしました");
  };

  const pause = () => {
    if (!startedAtRef.current) return;
    if (!(phaseRef.current === "work" || phaseRef.current === "rest")) return;

    stopTick();
    setMsg("一時停止しました");
  };

  const resume = () => {
    if (!startedAtRef.current) return;
    if (!(phaseRef.current === "work" || phaseRef.current === "rest")) return;

    startTick();
    setMsg("再開しました");
  };

  const startRestManual = () => {
    if (!preset) return;
    if (!startedAtRef.current) {
      setMsg("先にスタートを押してください。");
      return;
    }
    setPhase("rest");
    setRemain(restSec);
    startTick();
    announcePhaseStart("rest");
  };

  const skip = () => {
    if (!startedAtRef.current) return;
    stopTick();
    onPhaseFinished();
  };

  const saveAndExit = async () => {
    if (!userId) {
      setMsg("ユーザー情報の取得に失敗しました。");
      return;
    }
    if (!preset) return;

    const st = startedAtRef.current;
    if (!st) {
      setMsg("先にスタートを押してください。");
      return;
    }

    stopTick();

    const ended = new Date();

    const { error } = await supabase.from("sessions").insert({
      user_id: userId,
      preset_id: preset.id,
      started_at: st.toISOString(),
      ended_at: ended.toISOString(),
      sets_completed: sets,
      total_rest_seconds: totalRest,
      total_work_seconds: totalWork,
    });

    if (error) {
      setMsg(`保存に失敗しました: ${error.message}`);
      return;
    }

    setMsg("保存しました");
    router.push("/sessions");
  };

  const phaseLabel = useMemo(() => {
    if (!preset) return "";
    if (phase === "work") return "トレーニング";
    if (phase === "rest") return "休憩";
    return isInterval ? "待機" : "セット中";
  }, [phase, isInterval, preset]);

  const running = startedAt !== null;

  return (
    <Page>
      <Card>
        <AppHeader title="タイマー" />

        {!preset ? (
          <Msg>{msg || "Loading..."}</Msg>
        ) : (
          <>
            <div style={{ marginTop: -6, marginBottom: 10 }}>
              <Sub>{preset.name}</Sub>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8 }}>{phaseLabel}</div>
              <div style={{ fontSize: 52, fontWeight: 900, marginTop: 6 }}>
                {phase === "work" || phase === "rest" ? fmt(remain) : "--:--"}
              </div>

              {/* ✅ ここが改行の主犯なので、nowrapの塊でwrapさせる */}
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.9,
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>
                  セット: <b>{sets}</b>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  休憩合計: <b>{fmt(totalRest)}</b>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  トレ合計: <b>{fmt(totalWork)}</b>
                </span>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
                {isInterval ? `インターバル：トレ ${workSec}s / 休憩 ${restSec}s` : `休憩のみ：休憩 ${restSec}s（セット無制限）`}
              </div>

              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>
                状態: {running ? "計測中" : "未開始"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <Button onClick={running ? resetRun : startRun}>{running ? "リセット" : "スタート"}</Button>
              <Button variant="ghost" onClick={pause} disabled={!running}>
                一時停止
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <Button variant="ghost" onClick={resume} disabled={!running}>
                再開
              </Button>

              {preset.work_mode === "manual" ? (
                <Button onClick={startRestManual} disabled={!running}>
                  休憩スタート
                </Button>
              ) : (
                <Button variant="ghost" onClick={skip} disabled={!running}>
                  次へ
                </Button>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <Button variant="danger" onClick={saveAndExit} disabled={!running}>
                保存して終了
              </Button>
            </div>

            {/* メッセージ領域は常に固定（ズレない） */}
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
          </>
        )}
      </Card>
    </Page>
  );
}
