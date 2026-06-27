"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Submodule {
  _id: string;
  title: string;
  type: "page" | "quiz" | "pdf_exercise";
}

interface ContentBlock {
  type: "text" | "image" | "video";
  html?: string;
  url?: string;
  videoProvider?: "youtube" | "vimeo";
  videoId?: string;
}

function PageEditor({ submoduleId }: { submoduleId: string }) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetch(`/api/submodules/${submoduleId}/page-content`)
      .then((res) => res.json())
      .then((data) => {
        setBlocks(data.contentBlocks || []);
        setIsLoading(false);
      });
  }, [submoduleId]);

  function addBlock(type: ContentBlock["type"]) {
    if (type === "text") {
      setBlocks([...blocks, { type: "text", html: "" }]);
    } else if (type === "image") {
      setBlocks([...blocks, { type: "image", url: "" }]);
    } else {
      setBlocks([...blocks, { type: "video", videoProvider: "youtube", videoId: "" }]);
    }
  }

  function updateBlock(index: number, updates: Partial<ContentBlock>) {
    const next = [...blocks];
    next[index] = { ...next[index], ...updates };
    setBlocks(next);
  }

  function removeBlock(index: number) {
    setBlocks(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveMessage("");

    const res = await fetch(`/api/submodules/${submoduleId}/page-content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentBlocks: blocks }),
    });

    setIsSaving(false);
    setSaveMessage(res.ok ? "Saved." : "Could not save.");
    setTimeout(() => setSaveMessage(""), 2000);
  }

  function extractYouTubeId(input: string): string {
    // Accepts a full URL or a bare ID, returns just the ID
    const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : input;
  }

  function extractVimeoId(input: string): string {
    const match = input.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : input;
  }

  if (isLoading) return <p className="text-gray-500">Loading page content...</p>;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => addBlock("text")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          + Text
        </button>
        <button
          onClick={() => addBlock("image")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          + Image
        </button>
        <button
          onClick={() => addBlock("video")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          + Video
        </button>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-400">{block.type}</span>
              <div className="flex gap-1">
                <button onClick={() => moveBlock(index, -1)} className="px-2 text-gray-400 hover:text-gray-700">↑</button>
                <button onClick={() => moveBlock(index, 1)} className="px-2 text-gray-400 hover:text-gray-700">↓</button>
                <button onClick={() => removeBlock(index)} className="px-2 text-red-400 hover:text-red-600">✕</button>
              </div>
            </div>

            {block.type === "text" && (
              <textarea
                rows={4}
                value={block.html || ""}
                onChange={(e) => updateBlock(index, { html: e.target.value })}
                placeholder="Write text content here..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}

            {block.type === "image" && (
              <div>
                <input
                  type="text"
                  value={block.url || ""}
                  onChange={(e) => updateBlock(index, { url: e.target.value })}
                  placeholder="Image URL"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {block.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.url} alt="" className="mt-2 max-h-48 rounded-md" />
                )}
              </div>
            )}

            {block.type === "video" && (
              <div className="space-y-2">
                <select
                  value={block.videoProvider || "youtube"}
                  onChange={(e) => updateBlock(index, { videoProvider: e.target.value as "youtube" | "vimeo" })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                </select>
                <input
                  type="text"
                  value={block.videoId || ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const cleaned =
                      block.videoProvider === "vimeo" ? extractVimeoId(raw) : extractYouTubeId(raw);
                    updateBlock(index, { videoId: cleaned });
                  }}
                  placeholder="Paste video URL or ID"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {block.videoId && (
                  <div className="aspect-video w-full max-w-md overflow-hidden rounded-md">
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
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save page"}
        </button>
        {saveMessage && <span className="text-sm text-gray-500">{saveMessage}</span>}
      </div>
    </div>
  );
}

export default function SubmoduleEditorPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;
  const submoduleId = params.submoduleId as string;

  const [submodule, setSubmodule] = useState<Submodule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/submodules/${submoduleId}`)
      .then((res) => res.json())
      .then((data) => {
        setSubmodule(data);
        setIsLoading(false);
      });
  }, [submoduleId]);

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (!submodule) return <p className="p-8 text-red-600">Submodule not found.</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link
        href={`/teacher/courses/${courseId}/modules/${moduleId}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to module
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-semibold text-gray-900">{submodule.title}</h1>

      {submodule.type === "page" && <PageEditor submoduleId={submoduleId} />}
      {submodule.type === "quiz" && <p className="text-gray-500">Quiz editor coming next.</p>}
      {submodule.type === "pdf_exercise" && <p className="text-gray-500">PDF exercise editor coming later.</p>}
    </div>
  );
}