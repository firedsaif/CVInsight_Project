import React, { useState, useEffect } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState("");
  const [resumes, setResumes] = useState([]);

  // Fetch resumes from backend
  const fetchResumes = async () => {
    try {
      console.log("🚀 Fetching resumes from backend...");  
      const res = await fetch("http://127.0.0.1:5000/resumes");
      const data = await res.json();
      console.log("✅ Resumes received in frontend:", data);  // Debugging line
      setResumes(data);
    } catch (error) {
      console.error("❌ Error fetching resumes:", error);
    }
  };
  

  // Load resumes on startup
  useEffect(() => {
    fetchResumes();
  }, []);

  // Handle file selection
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  // Upload resume
  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      
      // Refresh resumes list after upload
      fetchResumes();
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>CVInsight Resume Parser</h1>

      {/* File Upload Section */}
      <div style={styles.uploadContainer}>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} style={styles.uploadButton}>
          Upload Resume
        </button>
      </div>

      {/* Show Response from Backend */}
      {response && (
        <pre style={styles.responseBox}>
          <strong>Parsed Output:</strong>
          <br />
          {response}
        </pre>
      )}

      {/* Parsed Resumes Section */}
      <h2 style={styles.subHeader}>Parsed Resumes from Database</h2>
      <div style={styles.resumesContainer}>
        {resumes.length > 0 ? (
          resumes.map((resume) => (
            <div key={resume.id} style={styles.resumeCard}>
              <h3>{resume.name}</h3>
              <p><strong>Email:</strong> {resume.email}</p>
              <p><strong>Phone:</strong> {resume.phone}</p>
              <p><strong>Education:</strong> {resume.education}</p>
              <p><strong>Work Experience:</strong> {resume.work_experience}</p>
              <p><strong>Skills:</strong> {resume.skills}</p>
            </div>
          ))
        ) : (
          <p style={styles.noResumesText}>No resumes found in the database.</p>
        )}
      </div>
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    padding: "20px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f4f4f4",
    minHeight: "100vh",
  },
  header: {
    color: "#333",
    fontSize: "28px",
    marginBottom: "20px",
  },
  uploadContainer: {
    marginBottom: "20px",
  },
  uploadButton: {
    marginLeft: "10px",
    padding: "8px 12px",
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  responseBox: {
    backgroundColor: "#fff",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    textAlign: "left",
    width: "80%",
    margin: "10px auto",
    whiteSpace: "pre-wrap",
  },
  subHeader: {
    color: "#444",
    fontSize: "22px",
    marginTop: "30px",
  },
  resumesContainer: {
    textAlign: "left",
    margin: "20px auto",
    width: "80%",
  },
  resumeCard: {
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    marginBottom: "10px",
    boxShadow: "0px 2px 5px rgba(0,0,0,0.1)",
  },
  noResumesText: {
    textAlign: "center",
    color: "#777",
  },
};

export default App;
