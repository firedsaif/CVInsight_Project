/*
read resume as pdf file 

OPENAI_API_KEY="your-key"
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

// prompt 
You are an expert recruiter and resume reviewer. I will provide you with a candidate's resume along with some performance and evaluation metrics.
Please do the following:

Score the resume out of 100 based on how well it matches general standards for a strong candidate (clarity, experience, relevance, structure, achievements, etc.).

Provide a short paragraph of constructive feedback (2-5 sentences) explaining what the candidate did well and what could be improved.

Here is the resume (in plain text):
[Insert resume content here]

Here are the candidate's evaluation metrics (if available):

Years of Experience: [X]

Education Level: [Bachelor’s/Master’s/etc.]

Technical Skills (list): [e.g., Python, SQL, React]

Role Applied For: [e.g., Backend Engineer]

Notable Achievements: [list if applicable]
curl https://openrouter.ai/api/v1/chat/completions      -H "Authorization: Bearer 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"      -H "Content-Type: application/json"      -d '{
       "model": "deepseek/deepseek-r1-zero:free",
       "messages": [{"role": "user", "content": "How much on average a domain purchase costs?"}]
     }'
*/
import fetch from "node-fetch";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const resumePath = "/hdd-mount/hdd-files/sem6/se/CVInsight_Project/resume.pdf"; // Change this path if needed
const apiKey = "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";

const metrics = {
    yearsOfExperience: 5,
    educationLevel: "Bachelor's in Computer Science",
    technicalSkills: ["Python", "SQL", "React", "Node.js"],
    roleAppliedFor: "Backend Engineer",
};

const promptHeader = `
You are an expert recruiter and resume reviewer. I will provide you with a candidate's resume along with some performance and evaluation metrics.
Please do the following:

1. Score the resume out of 100 based on how well it matches general standards for a strong candidate (clarity, experience, relevance, structure, achievements, etc.).

2. Provide a short paragraph of constructive feedback (2-5 sentences) explaining what the candidate did well and what could be improved.

3.keep your feedback & score short and concise.

Here is the resume (in plain text):
`;

function buildPrompt(resumeText, metrics) {
    return `${promptHeader}${resumeText}\n\nHere are the candidate's evaluation metrics:\n
Years of Experience: ${metrics.yearsOfExperience}
Education Level: ${metrics.educationLevel}
Technical Skills: ${metrics.technicalSkills.join(", ")}
Role Applied For: ${metrics.roleAppliedFor}
`;
}

async function analyzeResume() {
    try {
        const pdfBuffer = fs.readFileSync(resumePath); // Reads the PDF file
        const pdfData = await pdfParse(pdfBuffer); // Parse the PDF
        const resumeText = pdfData.text; // Extract text from the PDF
        const prompt = buildPrompt(resumeText, metrics); // Build the prompt for the LLM

        const payload = {
            model: "thudm/glm-z1-32b:free",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        };

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json(); // Parse the response as JSON

        const content = data?.choices && Array.isArray(data.choices)
            ? data.choices[0]?.message?.content
            : null;

        if (!content) {
            console.error("Could not extract content from response:", data);
        } else {
            console.log("LLM Response:\n", content);
        }




    } catch (err) {
        console.error("Error:", err); // Catch and log errors
    }
}

analyzeResume(); // Run the function
