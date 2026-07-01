"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface QuizQuestion {
  question: string;
  options: string[];
  points: number;
}

interface Attempt {
  score: number;
  maxScore: number;
  answers: number[];
  completedAt: string;
}

export default function TakeQuizPage() {
  const params = useParams();
  const submoduleId = params.submoduleId as string;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [existingAttempt, setExistingAttempt] = useState<Attempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const submoduleRes = await fetch(`/api/submodules/${submoduleId}`);
      const submoduleData = await submoduleRes.json();

      const moduleRes = await fetch(`/api/modules/${submoduleData.moduleId}`);
      const moduleData = await moduleRes.json();
      setCourseId(moduleData.courseId);

      const [quizRes, attemptRes] = await Promise.all([
        fetch(`/api/submodules/${submoduleId}/quiz`),
        fetch(`/api/submodules/${submoduleId}/quiz/attempt`),
      ]);

      const quizData = await quizRes.json();
      const attemptData = await attemptRes.json();

      setQuestions(quizData.questions || []);
      setAnswers(new Array((quizData.questions || []).length).fill(null));
      setExistingAttempt(attemptData.attempt);
      setIsLoading(false);
    }
    load();
  }, [submoduleId]);

  function selectAnswer(qIndex: number, optionIndex: number) {
    const next = [...answers];
    next[qIndex] = optionIndex;
    setAnswers(next);
  }

  async function handleSubmit() {
    if (answers.some((a) => a === null)) {
      setError("Please answer every question before submitting.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const res = await fetch(`/api/submodules/${submoduleId}/quiz/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not submit quiz.");
      setIsSubmitting(false);
      return;
    }

    setExistingAttempt(data);
    setIsSubmitting(false);

    if (courseId) {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, submoduleId, markComplete: true }),
      });
    }
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading quiz...</p>;

  if (existingAttempt) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-sm text-green-700">Quiz completed</p>
          <p className="mt-1 text-3xl font-semibold text-green-800">
            {existingAttempt.score} / {existingAttempt.maxScore}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
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
        <span className="text-gray-900 font-medium">Quiz</span>
      </nav>

    <h1 className="mb-6 text-2xl font-semibold text-gray-900">Quiz</h1>

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-3 font-medium text-gray-900">
              {qIndex + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oIndex) => (
                <label
                  key={oIndex}
                  className="flex items-center gap-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name={`q-${qIndex}`}
                    checked={answers[qIndex] === oIndex}
                    onChange={() => selectAnswer(qIndex, oIndex)}
                  />
                  <span className="text-sm text-gray-800">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit quiz"}
      </button>
    </div>
  );
}