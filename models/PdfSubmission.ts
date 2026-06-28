import mongoose, { Schema, models, model } from "mongoose";

export type AnnotationType = "text" | "draw";

export interface IAnnotation {
  id: string;            // client-generated unique id, so we can update/delete individual annotations
  type: AnnotationType;
  page: number;           // which PDF page (1-indexed) this belongs to
  x: number;              // position as a FRACTION of page width (0 to 1) — resolution-independent
  y: number;              // position as a fraction of page height (0 to 1)
  width?: number;         // for text boxes: fraction of page width
  height?: number;        // for text boxes: fraction of page height
  text?: string;          // for type: "text"
  color?: string;         // text color or stroke color
  fontSize?: number;      // for type: "text", in px at a reference page width
  path?: { x: number; y: number }[]; // for type: "draw" — list of points, also as fractions (0-1)
  strokeWidth?: number;   // for type: "draw"
}

export interface IPdfSubmission {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;     // ref User._id
  pdfExerciseId: mongoose.Types.ObjectId; // ref PdfExercise._id
  annotations: IAnnotation[];
  score?: number;        // teacher-assigned, optional
  submittedAt: Date;
  updatedAt: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["text", "draw"], required: true },
    page: { type: Number, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    text: { type: String },
    color: { type: String },
    fontSize: { type: Number },
    path: [{ x: Number, y: Number, _id: false }],
    strokeWidth: { type: Number },
  },
  { _id: false }
);

const PdfSubmissionSchema = new Schema<IPdfSubmission>({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  pdfExerciseId: { type: Schema.Types.ObjectId, ref: "PdfExercise", required: true },
  annotations: { type: [AnnotationSchema], default: [] },
  score: { type: Number },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

PdfSubmissionSchema.index({ studentId: 1, pdfExerciseId: 1 }, { unique: true });

export const PdfSubmission = models.PdfSubmission || model<IPdfSubmission>("PdfSubmission", PdfSubmissionSchema);