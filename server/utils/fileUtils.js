import crypto from "crypto"
import fs from "fs"

// Generate a hash for a file to detect duplicates
export const generateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const fileBuffer = fs.readFileSync(filePath)
      const hashSum = crypto.createHash("sha256")
      hashSum.update(fileBuffer)
      const hash = hashSum.digest("hex")
      resolve(hash)
    } catch (error) {
      reject(error)
    }
  })
}

// Determine status based on score
export const getStatusFromScore = (score) => {
  if (score >= 80) return "shortlisted"
  if (score >= 60) return "review"
  return "rejected"
}

// Create uploads directory if it doesn't exist
export const ensureUploadsDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
