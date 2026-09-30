"use client";

import { useRef } from "react";
import { useUser } from "@/lib/AuthContext";
import { getPlan } from "@/lib/plans";
import { useWatchLimit } from "@/lib/useWatchLimit";
import { TimeRemainingChip, WatchLimitOverlay } from "./WatchLimitOverlay";

interface VideoPlayerProps {
  video: {
    id: string;
    videotitle: string;
    videoUrl: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  // Logged-out viewers get the Free limit.
  const plan = getPlan(user?.plan);
  const { remaining, locked } = useWatchLimit(videoRef, plan.watchLimitSec, video.id);

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden" data-testid="video-player">
      <video ref={videoRef} className="w-full h-full" controls={!locked} src={video?.videoUrl}>
        Your browser does not support the video tag.
      </video>
      {remaining !== null && !locked && <TimeRemainingChip remaining={remaining} />}
      {locked && <WatchLimitOverlay plan={plan} />}
    </div>
  );
}
