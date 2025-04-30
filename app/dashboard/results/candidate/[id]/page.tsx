"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, User, FileCheck, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// API URL - would typically come from environment variables
const API_URL = "http://localhost:5000"

interface Candidate {
  filename: string
  score: number
  feedback: string
  error?: string
}

export default function CandidateDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Extract batchId and candidateId from the URL
  const { id } = params
  const searchParams = new URLSearchParams(window.location.search)
  const batchId = searchParams.get("batchId")
  const candidateIndex = Number.parseInt(id as string, 10)

  useEffect(() => {
    const fetchCandidateDetails = async () => {
      if (!batchId) {
        setError("No batch ID provided")
        setLoading(false)
        return
      }

      try {
        const token = localStorage.getItem("token")
        if (!token) {
          setError("You are not logged in. Please log in to continue.")
          setLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/api/results/${batchId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch results")
        }

        const data = await response.json()

        if (!data.results || !data.results[candidateIndex]) {
          throw new Error("Candidate not found")
        }

        setCandidate(data.results[candidateIndex])
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setLoading(false)
      }
    }

    fetchCandidateDetails()
  }, [batchId, candidateIndex])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const getStatusBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-500">Shortlisted</Badge>
    } else if (score >= 60) {
      return <Badge className="bg-yellow-500">Review</Badge>
    } else {
      return (
        <Badge variant="outline" className="text-red-500 border-red-500">
          Rejected
        </Badge>
      )
    }
  }

  // Extract potential issues from feedback (simplified version)
  const extractIssues = (feedback: string): string[] => {
    const issues = []

    // Look for common issue indicators in the feedback
    if (feedback.toLowerCase().includes("gap") || feedback.toLowerCase().includes("time gap")) {
      issues.push("Resume has unexplained time gaps")
    }

    if (feedback.toLowerCase().includes("improve") || feedback.toLowerCase().includes("could be better")) {
      issues.push("Resume needs improvement in certain areas")
    }

    if (feedback.toLowerCase().includes("lack") || feedback.toLowerCase().includes("missing")) {
      issues.push("Resume is missing important information")
    }

    if (feedback.toLowerCase().includes("format") || feedback.toLowerCase().includes("structure")) {
      issues.push("Resume formatting or structure needs improvement")
    }

    // If no specific issues found, provide a generic one
    if (issues.length === 0 && candidate && candidate.score < 70) {
      issues.push("Resume may not fully match the job requirements")
    }

    return issues
  }

  // Extract strengths from feedback (simplified version)
  const extractStrengths = (feedback: string): string[] => {
    const strengths = []

    // Look for common strength indicators in the feedback
    if (feedback.toLowerCase().includes("strong") || feedback.toLowerCase().includes("excellent")) {
      strengths.push("Has strong qualifications in key areas")
    }

    if (feedback.toLowerCase().includes("experience") && !feedback.toLowerCase().includes("lack of experience")) {
      strengths.push("Has relevant experience for the position")
    }

    if (feedback.toLowerCase().includes("skill") && !feedback.toLowerCase().includes("lack of skill")) {
      strengths.push("Possesses important skills for the role")
    }

    if (feedback.toLowerCase().includes("education") && !feedback.toLowerCase().includes("lack of education")) {
      strengths.push("Has appropriate educational background")
    }

    // If no specific strengths found, provide a generic one
    if (strengths.length === 0 && candidate && candidate.score >= 70) {
      strengths.push("Resume shows good overall qualifications")
    }

    return strengths
  }

  const handleContactCandidate = () => {
    // Try to extract email from the feedback using regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    const feedbackText = candidate?.feedback || ""
    const match = feedbackText.match(emailRegex)

    console.log("Searching for email in:", feedbackText)
    console.log("Email match result:", match)

    if (match && match[0]) {
      // If email found, open Gmail compose
      const email = match[0]
      console.log("Email found:", email)
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
      console.log("Opening URL:", gmailUrl)
      window.open(gmailUrl, "_blank")
    } else {
      // If no email found, show toast notification
      console.log("No email found, showing toast")
      toast({
        title: "No Contact Information",
        description: "No email address found in the candidate's resume.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading candidate details...</p>
        </div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Link href={`/dashboard/results?batchId=${batchId}`}>
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
          </Button>
        </Link>

        <Alert variant="destructive">
          <AlertDescription>{error || "Candidate not found"}. Please go back and try again.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Link href={`/dashboard/results?batchId=${batchId}`}>
        <Button variant="outline" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
        </Button>
      </Link>

      <div className="grid gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">{candidate.filename}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(candidate.score)}
              <span className={`font-bold ${getScoreColor(candidate.score)}`}>Score: {candidate.score}%</span>
            </div>
          </div>

          <div className="mt-4 md:mt-0">
            <Button onClick={handleContactCandidate}>Contact Candidate</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>AI Feedback</CardTitle>
              <CardDescription>Detailed analysis of the candidate's resume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Score Breakdown</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${getScoreColor(candidate.score)}`}>{candidate.score}%</span>
                    <Progress value={candidate.score} className="h-2 flex-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {candidate.score >= 80
                      ? "Excellent match for the position"
                      : candidate.score >= 60
                        ? "Good potential, may need additional review"
                        : "Not a strong match for this position"}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Complete Feedback</h3>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="whitespace-pre-line">{candidate.feedback}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" /> Candidate Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Resume</dt>
                    <dd className="text-sm">{candidate.filename}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd>{getStatusBadge(candidate.score)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Score</dt>
                    <dd className={`text-sm font-bold ${getScoreColor(candidate.score)}`}>{candidate.score}%</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileCheck className="mr-2 h-5 w-5" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {extractStrengths(candidate.feedback).map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" /> Potential Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {extractIssues(candidate.feedback).map((issue, index) => (
                    <li key={index} className="flex items-start">
                      <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-red-500"></div>
                      <span className="text-sm">{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
