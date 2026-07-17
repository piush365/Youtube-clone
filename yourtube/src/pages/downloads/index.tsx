import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Crown, Download, Play } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import {
  DownloadRecord,
  downloadVideoFile,
  getDownloads,
} from "@/lib/downloadService";
import { Button } from "@/components/ui/button";
import PremiumDialog from "@/components/PremiumDialog";

const DownloadsPage = () => {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDownloads(user.uid)
      .then(setDownloads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 p-8 text-center text-muted-foreground">
        Sign in to see your downloads.
      </div>
    );
  }

  const formatDate = (d: any) => {
    if (!d) return "";
    const date = d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
    return formatDistanceToNow(date) + " ago";
  };

  const redownload = async (item: DownloadRecord) => {
    try {
      toast.info("Preparing your download...");
      await downloadVideoFile(item.videoUrl, item.videotitle || "video");
      toast.success("Video saved to your device");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6" /> Downloads
        </h1>
        {user.premiumDownloads ? (
          <span className="flex items-center gap-1 text-sm font-medium text-yellow-500">
            <Crown className="w-4 h-4" /> Premium — unlimited downloads
          </span>
        ) : (
          <Button variant="outline" onClick={() => setPremiumOpen(true)}>
            <Crown className="w-4 h-4 mr-2 text-yellow-500" />
            Free plan: 1 download/day — Go Premium
          </Button>
        )}
      </div>

      {loading ? (
        <div>Loading downloads...</div>
      ) : downloads.length === 0 ? (
        <p className="text-muted-foreground">
          No downloads yet. Open a video and press the Download button.
        </p>
      ) : (
        <div className="space-y-3">
          {downloads.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-4"
            >
              <div>
                <p className="font-medium">{item.videotitle}</p>
                <p className="text-xs text-muted-foreground">
                  Downloaded {formatDate(item.downloadedon)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/watch/${item.videoid}`}>
                  <Button variant="ghost" size="sm">
                    <Play className="w-4 h-4 mr-1" /> Watch
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => redownload(item)}
                >
                  <Download className="w-4 h-4 mr-1" /> Save again
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PremiumDialog open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </div>
  );
};

export default DownloadsPage;
