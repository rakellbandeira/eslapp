"use client";

import { useState, useEffect } from "react";
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

export default function TeacherReviewPdfPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const submoduleId = params.submoduleId as string;

  const [exercise, setExercise] = useState<PdfExerciseData | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pdf-exercises/${submoduleId}/submission/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        setExercise(data.exercise);
        setAnnotations(data.submission?.annotations || []);
        setIsLoading(false);
      });
  }, [submoduleId, studentId]);

  if (isLoading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (!exercise) return <p className="p-8 text-red-600">Exercise not found.</p>;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">
        {exercise.fileName} <span className="text-sm font-normal text-gray-500">(read-only)</span>
      </h1>

      <PdfAnnotator
        fileUrl={exercise.fileUrl}
        annotations={annotations}
        onAnnotationsChange={() => {}} // no-op, since this view is read-only
        readOnly={true}
      />
    </div>
  );
}