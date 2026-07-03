import mongoose, { Schema, models, model } from "mongoose";

export interface IPdfExercise {
  _id: mongoose.Types.ObjectId;
  submoduleId: mongoose.Types.ObjectId;
  fileUrl: string;
  fileName: string;
  totalPoints?: number;
  assignmentMessage?: string; 
  updatedAt: Date;
}

const PdfExerciseSchema = new Schema<IPdfExercise>({
  submoduleId: { type: Schema.Types.ObjectId, ref: "Submodule", required: true, unique: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  totalPoints: { type: Number },
  updatedAt: { type: Date, default: Date.now },
  assignmentMessage: { type: String, default: "" },
});

export const PdfExercise = models.PdfExercise || model<IPdfExercise>("PdfExercise", PdfExerciseSchema);