import mongoose, { Schema, models, model } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  role: "student" | "teacher" | "admin";
  passwordHash: string; // only set for credentials login, not Google
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String },
  role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },
  passwordHash: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const User = models.User || model<IUser>("User", UserSchema);