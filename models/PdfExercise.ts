import mongoose, { Schema, models, model } from "mongoose";

export interface IPdfExercise {
  _id: mongoose.Types.ObjectId;
  submoduleId: mongoose.Types.ObjectId; // ref Submodule._id, one-to-one
  fileUrl: string;     // path/URL to the source PDF (local disk path for now)
  fileName: string;    // original filename, for display
  totalPoints?: number; // optional — teacher can assign a max score for grading
  updatedAt: Date;
}

const PdfExerciseSchema = new Schema<IPdfExercise>({
  submoduleId: { type: Schema.Types.ObjectId, ref: "Submodule", required: true, unique: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  totalPoints: { type: Number },
  updatedAt: { type: Date, default: Date.now },
});

export const PdfExercise = models.PdfExercise || model<IPdfExercise>("PdfExercise", PdfExerciseSchema);