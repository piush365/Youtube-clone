import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import { toggleLike, checkLiked } from "@/lib/likeService";
import { addToHistory } from "@/lib/historyService";
import { toggleWatchLater } from "@/lib/watchlaterService";
import { incrementViews } from "@/lib/videoService";
import {
  downloadVideoFile,
  getTodayDownloadCount,
  recordDownload,
} from "@/lib/downloadService";
import PremiumDialog from "./PremiumDialog";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.likes || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    setlikes(video.likes || 0);
    setIsLiked(false);
  }, [video]);

  useEffect(() => {
    const handleViews = async () => {
      try {
        await incrementViews(video.id);
        if (user) {
          await addToHistory(video.id, user.uid);
        }
      } catch (error) {
        console.log(error);
      }
    };
    handleViews();
  }, [video.id, user]);

  useEffect(() => {
    if (!user) return;
    checkLiked(video.id, user.uid).then(setIsLiked);
  }, [video.id, user]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const liked = await toggleLike(video.id, user.uid);
      setIsLiked(liked);
      setlikes((prev: number) => (liked ? prev + 1 : prev - 1));
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) return;
    try {
      const added = await toggleWatchLater(video.id, user.uid);
      setIsWatchLater(added);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      toast.error("Sign in to download videos");
      return;
    }
    if (downloading) return;
    setDownloading(true);
    try {
      // Free plan: 1 download per day. Premium: unlimited.
      if (!user.premiumDownloads) {
        const todayCount = await getTodayDownloadCount(user.uid);
        if (todayCount >= 1) {
          setPremiumOpen(true);
          return;
        }
      }
      toast.info("Preparing your download...");
      await downloadVideoFile(video.videoUrl, video.videotitle || "video");
      await recordDownload(user.uid, {
        id: video.id,
        videotitle: video.videotitle,
        videoUrl: video.videoUrl,
      });
      toast.success("Video downloaded — see it in your Downloads section");
    } catch (e) {
      console.error(e);
      toast.error("Download failed, please try again");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const createdAt = video.createdAt?.seconds
    ? new Date(video.createdAt.seconds * 1000)
    : new Date(video.createdAt);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-muted-foreground">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-secondary rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${isLiked ? "fill-current" : ""}`}
              />
              {likes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-secondary rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-secondary rounded-full"
            onClick={handleShare}
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-secondary rounded-full"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="w-5 h-5 mr-2" />
            {downloading ? "Downloading..." : "Download"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-secondary rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-secondary rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views?.toLocaleString()} views</span>
          <span>{formatDistanceToNow(createdAt)} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
      <PremiumDialog
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
      />
    </div>
  );
};

export default VideoInfo;
