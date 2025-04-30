"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  BarChart3,
  LogOut,
  Upload,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// API URL - would typically come from environment variables
const API_URL = "http://localhost:5000"

// Types for the analysis results
interface Candidate {
  filename: string
  score: number
  feedback: string
  error?: string
}

interface AnalysisResults {
  status: "processing" | "completed" | "error"
  total: number
  completed: number
  results: Candidate[]
}

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchId = searchParams.get("batchId")

  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState("score")
  const [sortOrder, setSortOrder] = useState("desc")
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const handleLogout = () => {
    setLoading(true)
    // Simulate logout
    setTimeout(() => {
      router.push("/login")
    }, 500)
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  // Navigate to candidate details page
  const viewCandidateDetails = (index: number) => {
    router.push(`/dashboard/results/candidate/${index}?batchId=${batchId}`)
  }

  // Fetch results when the component mounts or batchId changes
  useEffect(() => {
    if (!batchId) return

    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          setError("You are not logged in. Please log in to continue.")
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
        setResults(data)

        // If still processing, poll for updates
        if (data.status === "processing") {
          setPolling(true)
        } else {
          setPolling(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setPolling(false)
      }
    }

    fetchResults()

    // Set up polling if needed
    let pollInterval: NodeJS.Timeout | null = null

    if (polling) {
      pollInterval = setInterval(fetchResults, 2000)
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [batchId, polling])

  // Sort the candidates based on the current sort settings
  const sortedCandidates = results?.results
    ? [...results.results].sort((a, b) => {
        if (sortBy === "score") {
          return sortOrder === "asc" ? a.score - b.score : b.score - a.score
        } else if (sortBy === "name") {
          const nameA = a.filename || ""
          const nameB = b.filename || ""
          return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
        }
        return 0
      })
    : []

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

  // Calculate statistics for the analytics tab
  const calculateScoreDistribution = () => {
    if (!results?.results || results.results.length === 0) return []

    const highScores = results.results.filter((c) => c.score >= 80).length
    const mediumScores = results.results.filter((c) => c.score >= 60 && c.score < 80).length
    const lowScores = results.results.filter((c) => c.score < 60).length

    const total = results.results.length

    return [
      { range: "80-100%", count: highScores, percentage: (highScores / total) * 100 },
      { range: "60-79%", count: mediumScores, percentage: (mediumScores / total) * 100 },
      { range: "0-59%", count: lowScores, percentage: (lowScores / total) * 100 },
    ]
  }

  // Extract top skills from the candidates
  const calculateTopSkills = () => {
    if (!results?.results || results.results.length === 0) return []

    // This is a simplified version - in a real app, you'd extract skills from the feedback
    // For now, we'll just return some mock data
    return [
      { skill: "React", count: Math.floor(results.results.length * 0.7) },
      { skill: "JavaScript", count: Math.floor(results.results.length * 0.8) },
      { skill: "CSS", count: Math.floor(results.results.length * 0.6) },
      { skill: "TypeScript", count: Math.floor(results.results.length * 0.4) },
    ]
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 border-r bg-background">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <FileText className="h-6 w-6" />
            <span>ResumeAI</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid gap-1 px-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/parser">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Upload className="h-4 w-4" />
                Resume Parser
              </Button>
            </Link>
            <Link href="/dashboard/results">
              <Button variant="secondary" className="w-full justify-start gap-2">
                <Search className="h-4 w-4" />
                Results
              </Button>
            </Link>
          </nav>
        </div>
        <div className="border-t p-4">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {loading ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:pl-64 w-full">
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex h-14 items-center px-4">
            <div className="md:hidden mr-2">
              <Button variant="ghost" size="icon" className="md:hidden">
                <FileText className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Results</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogout} className="md:hidden">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Resume Analysis Results</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!batchId && !error && (
              <Alert>
                <AlertTitle>No results to display</AlertTitle>
                <AlertDescription>
                  Please upload resumes through the Resume Parser to see results.
                  <div className="mt-2">
                    <Link href="/dashboard/parser">
                      <Button size="sm" variant="outline">
                        Go to Parser
                      </Button>
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {batchId && results?.status === "processing" && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Resumes</CardTitle>
                  <CardDescription>
                    Please wait while we analyze your resumes. This may take a few minutes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Processing {results.completed} of {results.total} resumes
                      </span>
                      <span className="text-sm">{Math.round((results.completed / results.total) * 100)}%</span>
                    </div>
                    <Progress value={(results.completed / results.total) * 100} />
                    <div className="flex justify-center pt-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {batchId && results?.status === "completed" && (
              <Tabs defaultValue="candidates">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                  <TabsTrigger value="candidates">Candidates</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="candidates" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Candidate Results</CardTitle>
                      <CardDescription>View and compare candidates based on their resume scores</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <Button
                                variant="ghost"
                                className="p-0 font-medium flex items-center"
                                onClick={() => handleSort("name")}
                              >
                                Name
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              </Button>
                            </TableHead>
                            <TableHead>Feedback</TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                className="p-0 font-medium flex items-center"
                                onClick={() => handleSort("score")}
                              >
                                Score
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              </Button>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedCandidates.map((candidate, index) => (
                            <TableRow
                              key={index}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => viewCandidateDetails(index)}
                            >
                              <TableCell className="font-medium">
                                <div>{candidate.filename}</div>
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="line-clamp-2">{candidate.feedback}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold ${getScoreColor(candidate.score)}`}>
                                    {candidate.score}%
                                  </span>
                                  <Progress value={candidate.score} className="h-2 w-16" />
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(candidate.score)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      viewCandidateDetails(index)
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Open menu</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => viewCandidateDetails(index)}>
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>Download Resume</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem>Shortlist</DropdownMenuItem>
                                      <DropdownMenuItem>Reject</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Analytics</CardTitle>
                      <CardDescription>Insights and statistics about the candidate pool</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Score Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {calculateScoreDistribution().map((range, index) => (
                                <div key={index}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">{range.range}</span>
                                    <span className="text-sm font-medium">{range.count} candidates</span>
                                  </div>
                                  <Progress value={range.percentage} className="h-2" />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Top Skills</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {calculateTopSkills().map((skill, index) => (
                                <div key={index}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">{skill.skill}</span>
                                    <span className="text-sm font-medium">{skill.count} candidates</span>
                                  </div>
                                  <Progress value={(skill.count / results.results.length) * 100} className="h-2" />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
