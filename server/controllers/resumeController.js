import { v4 as uuidv4 } from "uuid"
import Resume from "../models/Resume.js"
import Batch from "../models/Batch.js"
import { analyzeResume } from "../services/resumeAnalyzer.js"
import { generateFileHash, getStatusFromScore } from "../utils/fileUtils.js"
import fs from "fs"

// Parse and analyze resumes
export const parseResumes = async (req, res) => {
  try {
    const jobDescription = req.body.jobDescription
    const files = req.files

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" })
    }

    if (!jobDescription) {
      return res.status(400).json({ error: "Job description is required" })
    }

    // Create a batch ID for this analysis session
    const batchId = uuidv4()

    // Create a new batch in the database
    const batch = await Batch.create({
      batchId,
      userId: req.user._id,
      jobDescription,
      status: "processing",
      total: files.length,
      completed: 0,
    })

    // Process each resume asynchronously
    const processPromises = files.map(async (file) => {
      try {
        // Generate file hash to check for duplicates
        const fileHash = await generateFileHash(file.path)

        // Check if this resume has already been processed
        const existingResume = await Resume.findOne({ fileHash })

        if (existingResume) {
          // If duplicate, don't process again but update batch count
          await Batch.findOneAndUpdate({ batchId }, { $inc: { completed: 1 } })

          // Clean up the file
          fs.unlinkSync(file.path)

          return {
            filename: file.originalname,
            duplicate: true,
            existingId: existingResume._id,
          }
        }

        // Extract metrics from job description
        const metrics = {
          yearsOfExperience: extractYearsOfExperience(jobDescription),
          educationLevel: extractEducationLevel(jobDescription),
          technicalSkills: extractSkills(jobDescription),
          roleAppliedFor: extractRoleTitle(jobDescription),
        }

        // Analyze the resume
        const result = await analyzeResume(file.path, metrics)

        // Determine status based on score
        const status = getStatusFromScore(result.score)

        // Save resume to database
        const resume = await Resume.create({
          userId: req.user._id,
          filename: file.filename,
          originalFilename: file.originalname,
          fileHash,
          jobDescription,
          score: result.score,
          feedback: result.feedback,
          status,
          batchId,
        })

        // Update batch completion count
        await Batch.findOneAndUpdate({ batchId }, { $inc: { completed: 1 } })

        // Clean up the file
        fs.unlinkSync(file.path)

        return {
          filename: file.originalname,
          score: result.score,
          feedback: result.feedback,
          status,
          _id: resume._id,
        }
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error)

        // Update batch completion count even for errors
        await Batch.findOneAndUpdate({ batchId }, { $inc: { completed: 1 } })

        // Clean up the file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }

        return {
          filename: file.originalname,
          error: "Failed to process resume",
          score: 0,
        }
      }
    })

    // Process all resumes in parallel
    await Promise.all(processPromises)

    // Update batch status to completed
    await Batch.findOneAndUpdate({ batchId }, { status: "completed" })

    // Return the batch ID to the client
    res.json({
      batchId,
      message: "Resume analysis started",
      status: "processing",
    })
  } catch (error) {
    console.error("Error in parse endpoint:", error)
    res.status(500).json({ error: "Failed to process resumes" })
  }
}

// Get analysis results for a specific batch
export const getResults = async (req, res) => {
  try {
    const { batchId } = req.params

    // Find the batch
    const batch = await Batch.findOne({ batchId, userId: req.user._id })

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" })
    }

    // Find all resumes for this batch
    const resumes = await Resume.find({ batchId, userId: req.user._id })

    // Format the response
    const response = {
      status: batch.status,
      total: batch.total,
      completed: batch.completed,
      results: resumes.map((resume) => ({
        _id: resume._id,
        filename: resume.originalFilename,
        score: resume.score,
        feedback: resume.feedback,
        status: resume.status,
        createdAt: resume.createdAt,
      })),
    }

    res.json(response)
  } catch (error) {
    console.error("Error in getResults:", error)
    res.status(500).json({ error: "Failed to fetch results" })
  }
}

// Get a specific resume by ID
export const getResumeById = async (req, res) => {
  try {
    const { id } = req.params

    const resume = await Resume.findOne({ _id: id, userId: req.user._id })

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" })
    }

    res.json({
      _id: resume._id,
      filename: resume.originalFilename,
      score: resume.score,
      feedback: resume.feedback,
      status: resume.status,
      createdAt: resume.createdAt,
      jobDescription: resume.jobDescription,
    })
  } catch (error) {
    console.error("Error in getResumeById:", error)
    res.status(500).json({ error: "Failed to fetch resume" })
  }
}

// Delete a batch and all associated resumes
export const deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params

    // Verify the batch exists and belongs to the user
    const batch = await Batch.findOne({ batchId, userId: req.user._id })

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" })
    }

    // Delete all resumes associated with this batch
    const deleteResumesResult = await Resume.deleteMany({ batchId, userId: req.user._id })

    // Delete the batch
    await Batch.deleteOne({ batchId, userId: req.user._id })

    res.json({
      message: "Batch and associated resumes deleted successfully",
      deletedResumes: deleteResumesResult.deletedCount,
    })
  } catch (error) {
    console.error("Error in deleteBatch:", error)
    res.status(500).json({ error: "Failed to delete batch" })
  }
}

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get total resumes count
    const totalResumes = await Resume.countDocuments({ userId: req.user._id })

    // Get shortlisted resumes count
    const shortlisted = await Resume.countDocuments({
      userId: req.user._id,
      status: "shortlisted",
    })

    // Calculate average score
    const averageScoreResult = await Resume.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, averageScore: { $avg: "$score" } } },
    ])

    const averageScore = averageScoreResult.length > 0 ? Math.round(averageScoreResult[0].averageScore) : 0

    // Get active jobs (unique job descriptions in the last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeJobsResult = await Batch.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $group: { _id: "$jobDescription" } },
      { $count: "count" },
    ])

    const activeJobs = activeJobsResult.length > 0 ? activeJobsResult[0].count : 0

    // Get recent activity (last 3 batches)
    const recentActivity = await Batch.aggregate([
      { $match: { userId: req.user._id } },
      { $sort: { createdAt: -1 } },
      { $limit: 3 },
      {
        $project: {
          _id: 1,
          batchId: 1,
          jobDescription: 1,
          createdAt: 1,
          status: 1,
          total: 1,
        },
      },
    ])

    // For each batch, get the role title
    const recentActivityWithRoles = recentActivity.map((batch) => ({
      ...batch,
      roleTitle: extractRoleTitle(batch.jobDescription),
    }))

    // Return all stats
    res.json({
      totalResumes,
      shortlisted,
      averageScore,
      activeJobs,
      recentActivity: recentActivityWithRoles,
    })
  } catch (error) {
    console.error("Error in getDashboardStats:", error)
    res.status(500).json({ error: "Failed to fetch dashboard statistics" })
  }
}

// Helper functions for extracting information from job description
function extractSkills(jobDescription) {
  // This is a simplified version - in a real app, you'd use NLP or a more sophisticated approach
  const commonTechSkills = [
    "JavaScript",
    "TypeScript",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "Python",
    "Django",
    "Flask",
    "Java",
    "Spring",
    "C#",
    ".NET",
    "PHP",
    "Laravel",
    "Ruby",
    "Rails",
    "Go",
    "Rust",
    "Swift",
    "Kotlin",
    "SQL",
    "MongoDB",
    "PostgreSQL",
    "MySQL",
    "Redis",
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Git",
    "CI/CD",
  ]

  const foundSkills = commonTechSkills.filter((skill) => jobDescription.toLowerCase().includes(skill.toLowerCase()))

  // If no skills were found, return some default ones
  return foundSkills.length > 0 ? foundSkills : ["JavaScript", "React", "Node.js", "SQL"]
}

function extractYearsOfExperience(jobDescription) {
  // Simple regex to find patterns like "5+ years" or "3-5 years"
  const regex = /(\d+)(?:\s*[-+]\s*\d+)?\s*years?/i
  const match = jobDescription.match(regex)

  return match ? Number.parseInt(match[1], 10) : 3 // Default to 3 years if not found
}

function extractEducationLevel(jobDescription) {
  const educationLevels = ["Bachelor's", "Master's", "PhD", "Doctorate", "Associate's", "High School"]

  for (const level of educationLevels) {
    if (jobDescription.includes(level)) {
      return level + " degree"
    }
  }

  return "Bachelor's degree" // Default
}

function extractRoleTitle(jobDescription) {
  const commonTitles = [
    "Software Engineer",
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Data Scientist",
    "DevOps Engineer",
    "Product Manager",
    "UX Designer",
    "UI Designer",
    "QA Engineer",
    "Project Manager",
  ]

  for (const title of commonTitles) {
    if (jobDescription.toLowerCase().includes(title.toLowerCase())) {
      return title
    }
  }

  return "Software Developer" // Default
}
