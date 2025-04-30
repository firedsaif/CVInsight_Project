import express from "express"
import {
  parseResumes,
  getResults,
  getResumeById,
  getDashboardStats,
  deleteBatch,
} from "../controllers/resumeController.js"
import { auth } from "../middleware/auth.js"
import multer from "multer"
import { ensureUploadsDirectory } from "../utils/fileUtils.js"
import path from "path"
import { fileURLToPath } from "url"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Set up file storage
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, "..", "uploads")

// Create uploads directory if it doesn't exist
ensureUploadsDirectory(uploadsDir)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4()
    const fileExtension = file.originalname.split(".").pop()
    cb(null, `${uniqueId}.${fileExtension}`)
  },
})

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed"), false)
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// Protected routes
router.post("/parse", auth, upload.array("resumes", 10), parseResumes)
router.get("/results/:batchId", auth, getResults)
router.get("/resume/:id", auth, getResumeById)
router.get("/dashboard/stats", auth, getDashboardStats)
router.delete("/batch/:batchId", auth, deleteBatch)

export default router
