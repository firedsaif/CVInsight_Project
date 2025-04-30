import fetch from "node-fetch"
import fs from "fs"
import { createRequire } from "module"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

const require = createRequire(import.meta.url)
const pdfParse = require("pdf-parse")

const apiKey = process.env.API_KEY

const promptHeader = `
You are an expert recruiter and resume reviewer. I will provide you with a candidate's resume along with some performance and evaluation metrics.
Please do the following:

1. Score the resume out of 100 based on how well it matches general standards for a strong candidate (clarity, experience, relevance, structure, achievements, etc.).

2. Provide a short paragraph of constructive feedback (2-5 sentences) explaining what the candidate did well and what could be improved.

3.keep your feedback & score short and concise, this is very important cause 2-5 sentences at max is the limit and we cant exceed.

4. Do not add any additional information or disclaimers by yourself outside the feedback.

5. Do not include any personal opinions or biases.

6. Do not include any information about the model or the API.

7. Make sure that response is well formatted and easy to read(Do not change the format on each response first do Score: [score]/100 and then Feedback:  (do not enclose headings)).

8. use thinking process to generate the response(do not mention separately it's just to emphasize the feedback).

9. keep the description part together and do not break it into multiple lines(this point is very important feedback should be all together and no extra note or paragraph).

10. Identify any significant time gaps in the resume and provide a brief explanation of how they might be perceived by a recruiter(should be part of feedback not separate).

11. Scoring criterion should be aligned with the matrix provided metrics.

12. the response should only include the score and feedback, nothing else (no notes etc in the end).
Here is the resume (in plain text):
`

function buildPrompt(resumeText, metrics) {
  return `${promptHeader}${resumeText}\n\nHere are the candidate's evaluation metrics:\n
Years of Experience: ${metrics.yearsOfExperience}
Education Level: ${metrics.educationLevel}
Technical Skills: ${metrics.technicalSkills.join(", ")}
Role Applied For: ${metrics.roleAppliedFor}
`
}

function parseScore(content) {
  // Extract score from the response
  const scoreMatch = content.match(/Score:\s*(\d+)\/100/i)
  return scoreMatch ? Number.parseInt(scoreMatch[1], 10) : 0
}

function parseFeedback(content) {
  // Extract feedback from the response
  const feedbackMatch = content.match(/Feedback:\s*([\s\S]+)/i)
  return feedbackMatch ? feedbackMatch[1].trim() : "No feedback provided"
}

export async function analyzeResume(resumePath, metrics) {
  try {
    const pdfBuffer = fs.readFileSync(resumePath) // Reads the PDF file
    const pdfData = await pdfParse(pdfBuffer) // Parse the PDF
    const resumeText = pdfData.text // Extract text from the PDF
    const prompt = buildPrompt(resumeText, metrics) // Build the prompt for the LLM

    const payload = {
      model: "tngtech/deepseek-r1t-chimera:free", // Or whatever model name you prefer
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json() // Parse the response as JSON

    const content = data?.choices && Array.isArray(data.choices) ? data.choices[0]?.message?.content : null

    if (!content) {
      console.error("Could not extract content from response:", data)
      throw new Error("Failed to get analysis from AI")
    }

    // Parse the score and feedback from the content
    const score = parseScore(content)
    const feedback = parseFeedback(content)

    return {
      score,
      feedback,
      rawResponse: content,
    }
  } catch (err) {
    console.error("Error analyzing resume:", err)
    throw err
  }
}
