"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";

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

      <div className="rounded-lg border border-gray-200 bg-white">
        {blocks.map((block, index) => (
          <div key={index} className="group relative border-b border-gray-100 px-6 py-4 last:border-b-0">
            <div className="mb-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs font-medium uppercase text-gray-400">{block.type}</span>
              <div className="flex gap-1">
                <button onClick={() => moveBlock(index, -1)} className="px-2 text-gray-400 hover:text-gray-700">↑</button>
                <button onClick={() => moveBlock(index, 1)} className="px-2 text-gray-400 hover:text-gray-700">↓</button>
                <button onClick={() => removeBlock(index)} className="px-2 text-red-400 hover:text-red-600">✕</button>
              </div>
            </div>
            {block.type === "text" && (
              <RichTextEditor
                content={block.html || ""}
                onChange={(html) => updateBlock(index, { html })}
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

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
}

function QuizEditor({ submoduleId }: { submoduleId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/submodules/${submoduleId}/quiz`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setIsLoading(false);
      });
  }, [submoduleId]);

  function addQuestion() {
    setQuestions([
      ...questions,
      { question: "", options: ["", ""], correctIndex: 0, points: 1 },
    ]);
  }

  function updateQuestion(index: number, updates: Partial<QuizQuestion>) {
    const next = [...questions];
    next[index] = { ...next[index], ...updates };
    setQuestions(next);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function addOption(qIndex: number) {
    const next = [...questions];
    next[qIndex].options = [...next[qIndex].options, ""];
    setQuestions(next);
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    const next = [...questions];
    next[qIndex].options[oIndex] = value;
    setQuestions(next);
  }

  function removeOption(qIndex: number, oIndex: number) {
    const next = [...questions];
    next[qIndex].options = next[qIndex].options.filter((_, i) => i !== oIndex);
    // If the removed option was the correct one, reset correctIndex to 0 to avoid pointing at nothing
    if (next[qIndex].correctIndex >= next[qIndex].options.length) {
      next[qIndex].correctIndex = 0;
    }
    setQuestions(next);
  }

  async function handleSave() {
    setError("");
    setIsSaving(true);

    const res = await fetch(`/api/submodules/${submoduleId}/quiz`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not save quiz.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setSaveMessage("Saved.");
    setTimeout(() => setSaveMessage(""), 2000);
  }

  if (isLoading) return <p className="text-gray-500">Loading quiz...</p>;

  return (
    <div>
      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-400">
                Question {qIndex + 1}
              </span>
              <button onClick={() => removeQuestion(qIndex)} className="text-sm text-red-500 hover:text-red-700">
                Remove question
              </button>
            </div>

            <input
              type="text"
              placeholder="Question text"
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="space-y-2">
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correctIndex === oIndex}
                    onChange={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                    title="Mark as correct answer"
                  />
                  <input
                    type="text"
                    placeholder={`Option ${oIndex + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {q.options.length > 2 && (
                    <button onClick={() => removeOption(qIndex, oIndex)} className="text-red-400 hover:text-red-600">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => addOption(qIndex)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              + Add option
            </button>

            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-gray-600">Points:</label>
              <input
                type="number"
                min={1}
                value={q.points}
                onChange={(e) => updateQuestion(qIndex, { points: parseInt(e.target.value) || 1 })}
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="mt-4 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        + Add question
      </button>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save quiz"}
        </button>
        {saveMessage && <span className="text-sm text-gray-500">{saveMessage}</span>}
      </div>
    </div>
  );
}


interface PdfExerciseData {
  fileUrl: string;
  fileName: string;
  totalPoints?: number;
}

function PdfExerciseEditor({ submoduleId }: { submoduleId: string }) {
  const [exercise, setExercise] = useState<PdfExerciseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [totalPoints, setTotalPoints] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/submodules/${submoduleId}/pdf-exercise`)
      .then((res) => res.json())
      .then((data) => {
        setExercise(data);
        if (data?.totalPoints) setTotalPoints(String(data.totalPoints));
        setIsLoading(false);
      });
  }, [submoduleId]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload/pdf", {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      setError(uploadData.error || "Upload failed.");
      setIsUploading(false);
      return;
    }

    const saveRes = await fetch(`/api/submodules/${submoduleId}/pdf-exercise`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl: uploadData.fileUrl,
        fileName: uploadData.fileName,
        totalPoints: totalPoints ? parseInt(totalPoints) : undefined,
      }),
    });

    const saved = await saveRes.json();
    setExercise(saved);
    setIsUploading(false);
  }

  async function handlePointsBlur() {
    if (!exercise) return;
    await fetch(`/api/submodules/${submoduleId}/pdf-exercise`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl: exercise.fileUrl,
        fileName: exercise.fileName,
        totalPoints: totalPoints ? parseInt(totalPoints) : undefined,
      }),
    });
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {exercise ? (
        <div>
          <p className="text-sm text-gray-600">Current file:</p>
          <p className="font-medium text-gray-900">{exercise.fileName}</p>
          <a
                        href={exercise.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View PDF
          </a>
          <p className="mt-4 text-sm text-gray-600">Replace file:</p>
        </div>
      ) : (
        <p className="mb-3 text-gray-500">No PDF uploaded yet.</p>
      )}

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="mt-2 text-sm"
      />

      {isUploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-2">
        <label className="text-sm text-gray-600">Total points (optional):</label>
        <input
          type="number"
          min={0}
          value={totalPoints}
          onChange={(e) => setTotalPoints(e.target.value)}
          onBlur={handlePointsBlur}
          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
        />
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
      {submodule.type === "quiz" && <QuizEditor submoduleId={submoduleId} />}      
      {submodule.type === "pdf_exercise" && <PdfExerciseEditor submoduleId={submoduleId} />}    
    
    </div>
  );
}