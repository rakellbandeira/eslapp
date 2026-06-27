import mongoose, { Schema, models, model } from "mongoose";

export type SubmoduleType = "page" | "quiz" | "pdf_exercise";

export interface ISubmodule {
  _id: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId; // ref Module._id
  title: string;
  type: SubmoduleType;
  order: number;
  createdAt: Date;
}

const SubmoduleSchema = new Schema<ISubmodule>({
  moduleId: { type: Schema.Types.ObjectId, ref: "Module", required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ["page", "quiz", "pdf_exercise"], required: true },
  order: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Submodule = models.Submodule || model<ISubmodule>("Submodule", SubmoduleSchema);