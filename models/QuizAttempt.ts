import mongoose, { Schema, models, model } from "mongoose";

export interface IQuizAttempt {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId; // ref User._id
  quizId: mongoose.Types.ObjectId;    // ref Quiz._id
  answers: number[];   // student's selected option index per question, same order as quiz.questions
  score: number;       // total points earned
  maxScore: number;    // total points possible, snapshotted at attempt time
  completedAt: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
  answers: { type: [Number], required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
});

// A student can retake — but let's allow only one attempt stored per student per quiz for now,
// keeping the most recent. (Easy to relax later if you want attempt history.)
QuizAttemptSchema.index({ studentId: 1, quizId: 1 }, { unique: true });

export const QuizAttempt = models.QuizAttempt || model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);