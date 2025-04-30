import mongoose from "mongoose"

const BatchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "error"],
      default: "processing",
    },
    total: {
      type: Number,
      required: true,
      min: 1,
    },
    completed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for faster queries
BatchSchema.index({ userId: 1, createdAt: -1 })
BatchSchema.index({ batchId: 1 }, { unique: true })

const Batch = mongoose.models.Batch || mongoose.model("Batch", BatchSchema)

export default Batch
