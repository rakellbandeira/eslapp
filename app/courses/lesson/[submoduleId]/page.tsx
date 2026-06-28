"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ContentBlock {
  type: "text" | "image" | "video";
  html?: string;
  url?: string;
  videoProvider?: "youtube" | "vimeo";
  videoId?: string;
}

export default function LessonPage() {
  const params = useParams();
  const submoduleId = params.submoduleId as string;

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/submodules/${submoduleId}`).then((r) => r.json()),
      fetch(`/api/submodules/${submoduleId}/page-content`).then((r) => r.json()),
    ]).then(([submoduleData, pageData]) => {
      setTitle(submoduleData.title);
      setBlocks(pageData.contentBlocks || []);
      setIsLoading(false);
    });
  }, [submoduleId]);

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{title}</h1>

      <div className="rounded-lg border border-gray-200 bg-white">
        {blocks.map((block, index) => (
          <div key={index} className="border-b border-gray-100 px-6 py-4 last:border-b-0">
            {block.type === "text" && (
              <div
                className="prose prose-sm max-w-none [&_.ProseMirror]:text-black"
                dangerouslySetInnerHTML={{ __html: block.html || "" }}
              />
            )}

            {block.type === "image" && block.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.url} alt="" className="max-w-full rounded-md" />
            )}

            {block.type === "video" && block.videoId && (
              <div className="aspect-video w-full max-w-lg overflow-hidden rounded-md">
                <iframe
                  className="h-full w-full"
                  src={
                    block.videoProvider === "vimeo"
                      ? `https://player.vimeo.com/video/${block.videoId}`
                      : `https://www.youtube.com/embed/${block.videoId}`
                  }
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}