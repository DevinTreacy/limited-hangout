
import fs from "node:fs";
import path from "node:path";
import VideoCard from "@/components/VideoCard";

type Vid = { title: string; platform: string; embed: string };

export default function VideosPage() {
  const filePath = path.join(process.cwd(), "data", "videos.json");
  const videos: Vid[] = JSON.parse(fs.readFileSync(filePath, "utf8"));

  return (
    <div className="grid gap-6">
      <h1 className="h1">Videos</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((v, i) => <VideoCard key={i} {...v} />)}
      </div>
    </div>
  );
}
