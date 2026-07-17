"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Crown,
  Maximize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import { getPlan, getWatchLimitSeconds } from "@/lib/planService";

interface VideoPlayerProps {
  video: {
    id: string;
    videotitle: string;
    videoUrl: string;
  };
  onNext?: () => void;
  onOpenComments?: () => void;
}

type Zone = "left" | "center" | "right";

const TAP_WINDOW_MS = 350;

export default function VideoPlayer({
  video,
  onNext,
  onOpenComments,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tapCount = useRef(0);
  const tapZone = useRef<Zone>("center");
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useUser();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const plan = getPlan(user?.plan);
  const limitSeconds = getWatchLimitSeconds(user?.plan);

  useEffect(() => {
    setLimitReached(false);
    setCurrentTime(0);
  }, [video?.id]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 700);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || limitReached) return;
    if (v.paused) {
      v.play();
      showFeedback("▶ Play");
    } else {
      v.pause();
      showFeedback("⏸ Paused");
    }
  };

  const seekBy = (seconds: number) => {
    const v = videoRef.current;
    if (!v || limitReached) return;
    v.currentTime = Math.max(
      0,
      Math.min(v.duration || Infinity, v.currentTime + seconds)
    );
    showFeedback(seconds > 0 ? "⏩ +10 seconds" : "⏪ -10 seconds");
  };

  // Gesture rules:
  //   center 1 tap  → play/pause      center 3 taps → next video
  //   right  2 taps → +10s            right  3 taps → close website
  //   left   2 taps → -10s            left   3 taps → open comments
  const executeGesture = (zone: Zone, taps: number) => {
    if (zone === "center") {
      if (taps === 1) togglePlay();
      else if (taps >= 3) {
        showFeedback("⏭ Next video");
        onNext?.();
      }
    } else if (zone === "right") {
      if (taps === 2) seekBy(10);
      else if (taps >= 3) {
        showFeedback("Closing website...");
        window.open("about:blank", "_self");
        window.close();
      }
    } else if (zone === "left") {
      if (taps === 2) seekBy(-10);
      else if (taps >= 3) {
        showFeedback("💬 Comments");
        onOpenComments?.();
      }
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const zone: Zone =
      x < rect.width / 3 ? "left" : x > (rect.width * 2) / 3 ? "right" : "center";

    if (tapTimer.current && tapZone.current === zone) {
      tapCount.current += 1;
      clearTimeout(tapTimer.current);
    } else {
      tapCount.current = 1;
      tapZone.current = zone;
      if (tapTimer.current) clearTimeout(tapTimer.current);
    }

    tapTimer.current = setTimeout(() => {
      executeGesture(tapZone.current, tapCount.current);
      tapCount.current = 0;
      tapTimer.current = null;
    }, TAP_WINDOW_MS);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (limitSeconds !== null && v.currentTime >= limitSeconds && !limitReached) {
      v.pause();
      setPlaying(false);
      setLimitReached(true);
    }
  };

  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    if (limitSeconds !== null && t >= limitSeconds) return;
    v.currentTime = t;
    setCurrentTime(t);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group select-none"
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        src={video?.videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => onNext?.()}
        playsInline
      />

      {/* Gesture layer (above video, below controls) */}
      <div className="absolute inset-0 bottom-14" onClick={handleTap} />

      {/* Gesture feedback */}
      {feedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-black/70 text-white text-lg px-4 py-2 rounded-full">
            {feedback}
          </span>
        </div>
      )}

      {/* Watch-limit overlay */}
      {limitReached && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center text-white p-6 z-10">
          <Crown className="w-10 h-10 text-yellow-400 mb-3" />
          <h3 className="text-xl font-semibold mb-1">
            Watch limit reached ({plan.watchMinutes} minutes on the{" "}
            {plan.label} plan)
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            Upgrade your plan to keep watching — Bronze ₹10 (7 min), Silver ₹50
            (10 min) or Gold ₹100 (unlimited).
          </p>
          <Link href="/plans">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              Upgrade plan
            </Button>
          </Link>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 h-14 px-3 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent text-white">
        <button onClick={togglePlay} aria-label="Play/Pause">
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <span className="text-xs tabular-nums">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeekBar}
          className="flex-1 h-1 accent-red-600 cursor-pointer"
        />
        <button
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
          }}
          aria-label="Mute"
        >
          {muted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
        <button onClick={toggleFullscreen} aria-label="Fullscreen">
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
