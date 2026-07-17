import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { getVideosByUploader } from "@/lib/videoService";
import { getUserById } from "@/lib/userService";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const [channelData, channelVideos] = await Promise.all([
          getUserById(id),
          getVideosByUploader(id),
        ]);
        setChannel(channelData);
        setVideos(channelVideos);
      } catch (error) {
        console.error("Error fetching channel data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!channel) {
    return <div>Channel not found</div>;
  }

  const isOwner = user?.uid === id;

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs />
        {isOwner && (
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={user?.uid}
              channelName={channel?.channelname}
            />
          </div>
        )}
        <div className="px-4 pb-8">
          <ChannelVideos videos={videos} />
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;
