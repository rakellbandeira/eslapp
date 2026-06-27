import mongoose, { Schema, models, model } from "mongoose";

export type ContentBlockType = "text" | "image" | "video";

export interface IContentBlock {
  type: ContentBlockType;
  html?: string;            // for type: "text"
  url?: string;              // for type: "image"
  videoProvider?: "youtube" | "vimeo"; // for type: "video"
  videoId?: string;          // for type: "video"
}

export interface IPage {
  _id: mongoose.Types.ObjectId;
  submoduleId: mongoose.Types.ObjectId; // ref Submodule._id, one-to-one
  contentBlocks: IContentBlock[];
  updatedAt: Date;
}

const ContentBlockSchema = new Schema<IContentBlock>(
  {
    type: { type: String, enum: ["text", "image", "video"], required: true },
    html: { type: String },
    url: { type: String },
    videoProvider: { type: String, enum: ["youtube", "vimeo"] },
    videoId: { type: String },
  },
  { _id: false } // blocks don't need their own _id, they're just ordered array items
);

const PageSchema = new Schema<IPage>({
  submoduleId: { type: Schema.Types.ObjectId, ref: "Submodule", required: true, unique: true },
  contentBlocks: { type: [ContentBlockSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export const Page = models.Page || model<IPage>("Page", PageSchema);