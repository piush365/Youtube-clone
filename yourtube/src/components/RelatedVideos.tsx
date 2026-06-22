import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideosProps {
  videos: Array<{
    id: string;
    videotitle: string;
    videochanel: string;
    videoUrl: string;
    views: number;
    createdAt: any;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  const formatDate = (createdAt: any) =>
    createdAt?.seconds
      ? formatDistanceToNow(new Date(createdAt.seconds * 1000))
      : formatDistanceToNow(new Date(createdAt));

  return (
    <div className="space-y-2">
      {videos?.map((video) => (
        <Link
          key={video.id}
          href={`/watch/${video.id}`}
          className="flex gap-2 group"
        >
          <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden flex-shrink-0">
            <video
              src={video.videoUrl}
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video.videotitle}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.videochanel}</p>
            <p className="text-xs text-gray-600">
              {video.views?.toLocaleString()} views •{" "}
              {formatDate(video.createdAt)} ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
