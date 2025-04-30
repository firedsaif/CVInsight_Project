import mongoose from "mongoose"

const ResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    fileHash: {
      type: String,
      required: true,
      unique: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    feedback: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["shortlisted", "review", "rejected"],
      required: true,
    },
    batchId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for faster queries
ResumeSchema.index({ userId: 1, createdAt: -1 })
ResumeSchema.index({ fileHash: 1 }, { unique: true })
ResumeSchema.index({ batchId: 1 })

const Resume = mongoose.models.Resume || mongoose.model("Resume", ResumeSchema)

export default Resume
