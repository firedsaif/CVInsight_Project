"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { FileText, BarChart3, LogOut, Upload, Search, X, Check, FileUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// API URL - would typically come from environment variables
const API_URL = "http://localhost:5000"

export default function ParserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [jobDescription, setJobDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)

  useEffect(() => {
    // Check if backend is reachable and user is authenticated
    const token = localStorage.getItem("token")

    fetch(`${API_URL}/api/health`, {
      method: "GET",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    }).catch((err) => {
      console.error("Backend connection error:", err)
      setError("Cannot connect to the backend server. Please ensure it's running.")
    })
  }, [])

  const handleLogout = () => {
    setLoading(true)
    // Simulate logout
    setTimeout(() => {
      router.push("/login")
    }, 500)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
      console.log("Files added:", newFiles)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Submit triggered", { files, jobDescription })

    if (files.length === 0 || !jobDescription.trim()) {
      setError("Please provide both resumes and a job description")
      return
    }

    setError(null)
    setUploading(true)
    setUploadProgress(0)

    // Create form data for the API request
    const formData = new FormData()
    formData.append("jobDescription", jobDescription)

    // Add all files to the form data
    files.forEach((file) => {
      formData.append("resumes", file)
    })

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          return prev + 5
        })
      }, 200)

      // Make the API request
      const token = localStorage.getItem("token")
      if (!token) {
        setError("You are not logged in. Please log in to continue.")
        setUploading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/parse`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload resumes")
      }

      const data = await response.json()
      setBatchId(data.batchId)

      setUploadProgress(100)
      setUploadComplete(true)

      // Redirect to results page after successful upload
      setTimeout(() => {
        router.push(`/dashboard/results?batchId=${data.batchId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setUploading(false)
      setUploadProgress(0)
    }
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
              <Button variant="secondary" className="w-full justify-start gap-2">
                <Upload className="h-4 w-4" />
                Resume Parser
              </Button>
            </Link>
            <Link href="/dashboard/results">
              <Button variant="ghost" className="w-full justify-start gap-2">
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
              <h1 className="text-lg font-semibold">Resume Parser</h1>
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
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                  <CardDescription>Enter the job description to match resumes against</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Enter the job description here..."
                    className="min-h-[200px]"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Resumes</CardTitle>
                  <CardDescription>Upload resumes in PDF format</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <FileUp className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">Drag and drop your files here</h3>
                      <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button type="button" variant="outline" size="sm">
                        Select Files
                      </Button>
                    </div>

                    {files.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Selected Files ({files.length})</h4>
                        <ul className="space-y-2">
                          {files.map((file, index) => (
                            <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove file</span>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Uploading...</span>
                          <span className="text-sm">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>
                    )}

                    {uploadComplete && (
                      <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle>Upload Complete!</AlertTitle>
                        <AlertDescription>
                          Your resumes have been uploaded successfully. Redirecting to results...
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={files.length === 0 || !jobDescription.trim() || uploading}
                    onClick={() =>
                      console.log("Button clicked", {
                        filesLength: files.length,
                        jobDescriptionEmpty: !jobDescription.trim(),
                        uploading,
                      })
                    }
                  >
                    {uploading ? "Processing..." : "Parse Resumes"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
