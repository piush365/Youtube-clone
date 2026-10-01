import { useState } from "react";
import { cloudinaryThumbnailUrl } from "@/lib/cloudinary";
import { formatClock } from "@/lib/watchLimit";
import type { Video } from "@/lib/types";

/**
 * A still frame for video lists. Cloudinary videos get a small JPEG instead of
 * a <video> element: every <video> opens its own media stream, and a page of
 * them starves the main player. Other URLs fall back to a metadata preload.
 */
export default function VideoThumbnail({ video, className = "" }: { video: Pick<Video, "videoUrl" | "duration">; className?: string }) {
  const thumbnail = cloudinaryThumbnailUrl(video.videoUrl);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const duration = video.duration ?? loadedDuration;

  return (
    <>
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary-transformed URL
        <img src={thumbnail} alt="" loading="lazy" className={`w-full h-full object-cover ${className}`} />
      ) : (
        <video
          src={video.videoUrl}
          preload="metadata"
          onLoadedMetadata={(e) => setLoadedDuration(e.currentTarget.duration)}
          className={`w-full h-full object-cover ${className}`}
        />
      )}
      {duration != null && isFinite(duration) && (
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">{formatClock(duration)}</div>
      )}
    </>
  );
}
