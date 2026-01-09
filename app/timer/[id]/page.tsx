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

  const [paused, setPaused] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const intervalRef = useRef<number | null>(null);

  // 休憩を開始したタイミング（manualの「次へで強制終了」用）
  const restStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    phaseRef.current = phase;

    // restに入ったら開始時刻を持つ、restを抜けたらクリア
    if (phase === "rest") {
      if (restStartedAtRef.current == null) restStartedAtRef.current = Date.now();
    } else {
      restStartedAtRef.current = null;
    }
  }, [phase]);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  const isInterval = useMemo(() => preset?.work_mode === "timed", [preset]);
  const isManual = useMemo(() => preset?.work_mode === "manual", [preset]);

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
    setPaused(false);

    const current = phaseRef.current;

    // interval: work -> rest
    if (current === "work") {
      setTotalWork((v) => v + workSec);
      setPhase("rest");
      setRemain(restSec);
      startTick();
      announcePhaseStart("rest");
      return;
    }

    // rest finished
    if (current === "rest") {
      // restが自然終了した場合は「満額」加算
      setTotalRest((v) => v + restSec);

      if (isInterval) {
        setSets((v) => v + 1);
        setPhase("work");
        setRemain(workSec);
        startTick();
        announcePhaseStart("work");
      } else {
        // manual: rest ends -> idle (set+1)
        setSets((v) => v + 1);
        setPhase("idle");
        setRemain(0);
        stopTick();
        setMsg("休憩終了");
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

  const running = startedAt !== null;

  const doReset = () => {
    stopTick();
    setStartedAt(null);
    startedAtRef.current = null;

    setPhase("idle");
    setRemain(0);
    setSets(0);
    setTotalRest(0);
    setTotalWork(0);

    setPaused(false);
    setMsg("リセットしました");
  };

  const startRun = () => {
    if (!preset) return;

    const now = new Date();
    setStartedAt(now);
    startedAtRef.current = now;

    setSets(0);
    setTotalRest(0);
    setTotalWork(0);
    setPaused(false);

    if (isInterval) {
      setPhase("work");
      setRemain(workSec);
      startTick();
      setMsg("開始しました");
      return;
    }

    // manual：スタートしたら休憩を即開始
    setPhase("rest");
    setRemain(restSec);
    startTick();
    announcePhaseStart("rest");
  };

  const resetRun = () => {
    if (!running) return;

    // manual の idle はタイマー動いてないので、そのままリセットOK
    if (isManual && phaseRef.current === "idle") {
      doReset();
      return;
    }

    // それ以外は「一時停止してから」
    if (!paused) {
      setMsg("一時停止してからリセットしてください");
      return;
    }
    doReset();
  };

  const pause = () => {
    if (!running) return;
    if (!(phaseRef.current === "work" || phaseRef.current === "rest")) return;

    stopTick();
    setPaused(true);
    setMsg("一時停止しました");
  };

  const resume = () => {
    if (!running) return;
    if (!paused) return;

    if (phaseRef.current === "work" || phaseRef.current === "rest") {
      startTick();
      setPaused(false);
      setMsg("再開しました");
    }
  };

  const next = () => {
    if (!running) return;
    if (paused) return;

    if (isManual) {
      if (phaseRef.current === "rest") {
        // 休憩を強制終了（経過分だけ加算）
        stopTick();

        const startedMs = restStartedAtRef.current;
        const elapsedSec =
          startedMs == null ? 0 : Math.max(0, Math.floor((Date.now() - startedMs) / 1000));

        // remainからの逆算でもいいが、実経過で加算
        setTotalRest((v) => v + Math.min(elapsedSec, restSec));
        setSets((v) => v + 1);

        setPhase("idle");
        setRemain(0);
        setMsg("休憩終了");
        return;
      }

      // idleなら次の休憩を開始
      setPhase("rest");
      setRemain(restSec);
      startTick();
      announcePhaseStart("rest");
      return;
    }

    // interval: 次のフェーズへ（今のフェーズを終了扱い）
    stopTick();
    onPhaseFinished();
  };

  const saveAndExit = async () => {
    if (!userId) return setMsg("ユーザー情報の取得に失敗しました。");
    if (!preset) return;

    const st = startedAtRef.current;
    if (!st) return setMsg("先にスタートを押してください。");

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

    if (error) return setMsg(`保存に失敗しました: ${error.message}`);

    setMsg("保存しました");
    router.push("/sessions");
  };

  const phaseLabel = useMemo(() => {
    if (!preset) return "";
    if (phase === "work") return "トレーニング";
    if (phase === "rest") return "休憩";
    return isInterval ? "待機" : "セット中";
  }, [phase, isInterval, preset]);

  const canReset =
    running && ((isManual && phase === "idle") || paused);

  const resetVariant = canReset ? "danger" : "ghost";

  const pauseDisabled = !running || paused || (isManual && phase === "idle");
  const nextDisabled = !running || paused;

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

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  opacity: 0.9,
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
                {isInterval
                  ? `インターバル：トレ ${workSec}s / 休憩 ${restSec}s`
                  : `休憩のみ：休憩 ${restSec}s（セット無制限）`}
              </div>

              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>
                状態: {running ? (paused ? "一時停止中" : "計測中") : "未開始"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              {!running ? (
                <Button onClick={startRun}>スタート</Button>
              ) : (
                <Button variant={resetVariant as any} onClick={resetRun} disabled={!canReset}>
                  リセット
                </Button>
              )}

              <Button variant="ghost" onClick={pause} disabled={pauseDisabled}>
                一時停止
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <Button variant="ghost" onClick={resume} disabled={!running || !paused}>
                再開
              </Button>
              <Button variant="ghost" onClick={next} disabled={nextDisabled}>
                次へ
              </Button>
            </div>

            <div style={{ marginTop: 10 }}>
              <Button variant="danger" onClick={saveAndExit} disabled={!running}>
                保存して終了
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
          </>
        )}
      </Card>
    </Page>
  );
}
