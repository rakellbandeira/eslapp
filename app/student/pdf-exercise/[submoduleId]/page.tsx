"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Annotation } from "@/components/PdfAnnotator";

const PdfAnnotator = dynamic(() => import("@/components/PdfAnnotator"), {
  ssr: false,
  loading: () => <p className="p-8 text-gray-500">Loading PDF viewer...</p>,
});

interface PdfExerciseData {
  fileUrl: string;
  fileName: string;
}

export default function StudentPdfExercisePage() {
  const params = useParams();
  const submoduleId = params.submoduleId as string;

  const [exercise, setExercise] = useState<PdfExerciseData | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");

  // Tracks the single pending autosave timer so we can always cancel the previous
  // one before starting a new one — this is the piece that was missing before.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always holds the LATEST annotations, even mid-debounce, so a manual save
  // or a late-firing autosave never sends stale data.
  const latestAnnotations = useRef<Annotation[]>(annotations);

  useEffect(() => {
    fetch(`/api/pdf-exercises/${submoduleId}/submission`)
      .then((res) => res.json())
      .then((data) => {
        setExercise(data.exercise);
        const loaded = data.submission?.annotations || [];
        setAnnotations(loaded);
        latestAnnotations.current = loaded;
        setIsLoading(false);
      });
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
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus("error");
    }
  }

  function handleAnnotationsChange(next: Annotation[]) {
    setAnnotations(next);
    latestAnnotations.current = next;
    setSaveStatus("unsaved");

    // Cancel any save that was already waiting to fire, then schedule a fresh one.
    // This guarantees only ONE save is ever pending at a time.
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

      <PdfAnnotator
        fileUrl={exercise.fileUrl}
        annotations={annotations}
        onAnnotationsChange={handleAnnotationsChange}
      />
    </div>
  );
}