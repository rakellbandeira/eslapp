"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Annotation } from "@/components/PdfAnnotator";
import Link from "next/link";

const PdfAnnotator = dynamic(() => import("@/components/PdfAnnotator"), {
  ssr: false,
  loading: () => <p className="p-8 text-gray-500">Loading PDF viewer...</p>,
});

interface PdfExerciseData {
  fileUrl: string;
  fileName: string;
  assignmentMessage?: string;
}

export default function StudentPdfExercisePage() {
  const params = useParams();
  const submoduleId = params.submoduleId as string;

  const [exercise, setExercise] = useState<PdfExerciseData | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestAnnotations = useRef<Annotation[]>([]);

  useEffect(() => {
    async function load() {
      const submoduleRes = await fetch(`/api/submodules/${submoduleId}`);
      const submoduleData = await submoduleRes.json();

      const moduleRes = await fetch(`/api/modules/${submoduleData.moduleId}`);
      const moduleData = await moduleRes.json();
      setCourseId(moduleData.courseId);

      const res = await fetch(`/api/pdf-exercises/${submoduleId}/submission`);
      const data = await res.json();
      setExercise(data.exercise);
      const loaded = data.submission?.annotations || [];
      setAnnotations(loaded);
      latestAnnotations.current = loaded;
      setIsLoading(false);
    }
    load();
  }, [submoduleId]);

  async function saveToServer(toSave: Annotation[]) {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/pdf-exercises/${submoduleId}/submission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotations: toSave }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");

      if (courseId && !hasMarkedComplete) {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, submoduleId, markComplete: true }),
        });
        setHasMarkedComplete(true);
      }
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus("error");
    }
  }

  function handleAnnotationsChange(next: Annotation[]) {
    setAnnotations(next);
    latestAnnotations.current = next;
    setSaveStatus("unsaved");

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      saveToServer(latestAnnotations.current);
    }, 2000);
  }

  function handleManualSave() {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    saveToServer(latestAnnotations.current);
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (!exercise) return <p className="p-8 text-red-600">Exercise not found.</p>;

  const statusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
      ? "All changes saved"
      : saveStatus === "unsaved"
      ? "Unsaved changes"
      : saveStatus === "error"
      ? "Could not save — try again"
      : "";

  const statusColor =
    saveStatus === "error" ? "text-red-600" : saveStatus === "saved" ? "text-green-600" : "text-gray-500";

  return (
    <div className="mx-auto max-w-4xl p-8">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
      <Link href="/dashboard" className="hover:underline" style={{ color: "#7B5EA7" }}>
        Dashboard
      </Link>
      <span>/</span>
      <span className="text-gray-900 font-medium">{exercise.fileName}</span>
      </nav>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{exercise.fileName}</h1>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${statusColor}`}>{statusLabel}</span>
          <button
            onClick={handleManualSave}
            disabled={saveStatus === "saving"}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save now
          </button>
        </div>
      </div>

      {exercise.assignmentMessage && (
        <div
          className="mb-4 rounded-lg border-l-4 px-4 py-3 text-sm text-gray-700"
          style={{ borderColor: "#9370BE", backgroundColor: "#F5F0FF" }}
        >
          <p className="font-medium mb-1" style={{ color: "#7B5EA7" }}>Assignment</p>
          <p className="whitespace-pre-wrap">{exercise.assignmentMessage}</p>
        </div>
      )}

      <PdfAnnotator
        fileUrl={exercise.fileUrl}
        annotations={annotations}
        onAnnotationsChange={handleAnnotationsChange}
      />
    </div>
  );
}