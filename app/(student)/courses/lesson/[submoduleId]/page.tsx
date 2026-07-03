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
  const [courseId, setCourseId] = useState<string | null>(null);
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);


  useEffect(() => {
    async function load() {
      const submoduleRes = await fetch(`/api/submodules/${submoduleId}`);
      const submoduleData = await submoduleRes.json();
      setTitle(submoduleData.title);

      const moduleRes = await fetch(`/api/modules/${submoduleData.moduleId}`);
      const moduleData = await moduleRes.json();
      setModuleId(moduleData._id);  // ← add this

      const courseRes = await fetch(`/api/courses/${moduleData.courseId}`);
      const courseData = await courseRes.json();
      setCourseId(courseData._id);

      const pageRes = await fetch(`/api/submodules/${submoduleId}/page-content`);
      const pageData = await pageRes.json();
      setBlocks(pageData.contentBlocks || []);

      // Record that the student visited this submodule (doesn't mark it complete yet)
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: courseData._id, submoduleId, markComplete: false }),
      });

      setIsLoading(false);
    }
    load();
  }, [submoduleId]);

  async function handleMarkComplete() {
    if (!courseId) return;
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, submoduleId, markComplete: true }),
    });
    setIsMarkedComplete(true);
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:underline" style={{ color: "#7B5EA7" }}>
          Dashboard
        </Link>
        <span>/</span>
        {courseId && (
          <>
            <Link href={`/courses/${courseId}`} className="hover:underline" style={{ color: "#7B5EA7" }}>
              Course
            </Link>
            <span>/</span>
          </>
        )}
        {courseId && moduleId && (
          <>
            <Link href={`/courses/${courseId}/modules/${moduleId}`} className="hover:underline" style={{ color: "#7B5EA7" }}>
              Module
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-medium">{title}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{title}</h1>

      <div className="rounded-lg border border-gray-200 bg-white">
        {blocks.map((block, index) => (
          <div key={index} className="border-b border-gray-100 px-6 py-4 last:border-b-0">
            {block.type === "text" && (
              <div className="overflow-x-auto">
                <div
                  className="prose prose-sm max-w-none [&_.ProseMirror]:text-black [&_table]:w-full [&_table]:border-collapse [&_table]:table-fixed [&_td]:break-words [&_td]:align-top [&_td]:p-2 [&_td]:border [&_td]:border-gray-300 [&_th]:break-words [&_th]:align-top [&_th]:p-2 [&_th]:border [&_th]:border-gray-300"
                  dangerouslySetInnerHTML={{ __html: block.html || "" }}
                />
              </div>
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

      <button
        onClick={handleMarkComplete}
        disabled={isMarkedComplete}
        className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isMarkedComplete ? "✓ Marked as read" : "Mark as read"}
      </button>
    </div>
  );
}