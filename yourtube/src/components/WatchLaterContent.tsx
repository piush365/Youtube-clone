"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWatchLater, removeFromWatchLater } from "@/lib/watchlaterService";
import { useUser } from "@/lib/AuthContext";

export default function WatchLaterContent() {
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadWatchLater();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadWatchLater = async () => {
    if (!user) return;
    try {
      const data = await getWatchLater(user.uid);
      setWatchLater(data);
    } catch (error) {
      console.error("Error loading watch later:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading watch later...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Save videos for later</h2>
        <p className="text-muted-foreground">
          Sign in to access your Watch later playlist.
        </p>
      </div>
    );
  }

  if (watchLater.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No videos saved</h2>
        <p className="text-muted-foreground">
          Videos you save for later will appear here.
        </p>
      </div>
    );
  }

  const handleRemoveFromWatchLater = async (watchLaterId: string) => {
    try {
      await removeFromWatchLater(watchLaterId);
      setWatchLater(watchLater.filter((item) => item.id !== watchLaterId));
    } catch (error) {
      console.error("Error removing from watch later:", error);
    }
  };

  const formatDate = (ts: any) =>
    ts?.seconds
      ? formatDistanceToNow(new Date(ts.seconds * 1000))
      : formatDistanceToNow(new Date(ts));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{watchLater.length} videos</p>
        <Button className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Play all
        </Button>
      </div>

      <div className="space-y-4">
        {watchLater.map((item) => (
          <div key={item.id} className="flex gap-4 group">
            <Link href={`/watch/${item.videoid.id}`} className="flex-shrink-0">
              <div className="relative w-40 aspect-video bg-secondary rounded overflow-hidden">
                <video
                  src={item.videoid?.videoUrl}
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/watch/${item.videoid.id}`}>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                  {item.videoid.videotitle}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground">
                {item.videoid.videochanel}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.videoid.views?.toLocaleString()} views •{" "}
                {formatDate(item.videoid.createdAt)} ago
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Added {formatDate(item.createdAt)} ago
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleRemoveFromWatchLater(item.id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from Watch later
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
