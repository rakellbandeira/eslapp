import mongoose, { Schema, models, model } from "mongoose";

export interface IQuizQuestion {
  question: string;
  options: string[];       // e.g. ["Paris", "London", "Berlin", "Madrid"]
  correctIndex: number;    // index into options[] that is correct
  points: number;          // how many points this question is worth
}

export interface IQuiz {
  _id: mongoose.Types.ObjectId;
  submoduleId: mongoose.Types.ObjectId; // ref Submodule._id, one-to-one
  questions: IQuizQuestion[];
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    points: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const QuizSchema = new Schema<IQuiz>({
  submoduleId: { type: Schema.Types.ObjectId, ref: "Submodule", required: true, unique: true },
  questions: { type: [QuizQuestionSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export const Quiz = models.Quiz || model<IQuiz>("Quiz", QuizSchema);