
"use client";
import React from "react";

export default function VideoCard({ title, embed }: { title: string; embed: string }) {
  return (
    <div className="card">
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          className="w-full h-full"
          src={embed}
          title={title}
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="mt-3 font-medium">{title}</div>
    </div>
  );
}
