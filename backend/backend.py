import os
import fitz  # PyMuPDF for PDF processing
import sqlite3
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Ensure uploads directory exists
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Database setup
DB_NAME = "resumes.db"

def create_database():
    """Creates the resumes database if it doesn't exist."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            phone TEXT,
            education TEXT,
            work_experience TEXT,
            skills TEXT
        )
    """)
    conn.commit()
    conn.close()

create_database()  # Ensure DB is ready

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file using PyMuPDF."""
    doc = fitz.open(pdf_path)
    text = "\n".join([page.get_text("text") for page in doc])
    return text

def parse_resume(text):
    """Extracts structured resume data from text."""
    
    # Split lines and remove empty ones
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # Extract Name (Assume first non-empty line is name)
    name = lines[0] if len(lines) > 0 else "Unknown"

    # Extract Email
    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    email = email_match.group(0) if email_match else "Not found"

    # Extract Phone Number
    phone_match = re.search(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b", text)
    phone = phone_match.group(0) if phone_match else "Not found"

    # Extract Sections
    sections = {
        "education": "",
        "work_experience": "",
        "leadership_experience": "",
        "skills": ""
    }

    current_section = None
    for line in lines:
        if "EDUCATION" in line.upper():
            current_section = "education"
            continue
        elif "WORK EXPERIENCE" in line.upper():
            current_section = "work_experience"
            continue
        elif "LEADERSHIP EXPERIENCE" in line.upper():
            current_section = "leadership_experience"
            continue
        elif "CERTIFICATIONS & SKILLS" in line.upper() or "SKILLS" in line.upper():
            current_section = "skills"
            continue

        if current_section:
            sections[current_section] += line + " "

    # Return structured data
    return {
        "name": name,
        "email": email,
        "phone": phone,
        "education": sections["education"].strip(),
        "work_experience": sections["work_experience"].strip(),
        "leadership_experience": sections["leadership_experience"].strip(),
        "skills": sections["skills"].strip()
    }

def store_resume_data(data):
    """Stores extracted resume data in the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO resumes (name, email, phone, education, work_experience, skills)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (data["name"], data["email"], data["phone"], data["education"], data["work_experience"], data["skills"]))
    conn.commit()
    conn.close()

@app.route("/upload", methods=["POST"])
def upload_resume():
    """Handles resume file uploads, extracts text, and saves to database."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(file_path)

    # Extract text and process resume
    resume_text = extract_text_from_pdf(file_path)
    extracted_data = parse_resume(resume_text)
    store_resume_data(extracted_data)

    return jsonify({"message": "File uploaded and processed successfully", "extracted_data": extracted_data})

@app.route('/resumes', methods=['GET'])
def get_resumes():
    conn = sqlite3.connect('resumes.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, email, phone, education, work_experience, skills FROM resumes")
    resumes = cursor.fetchall()
    
    conn.close()

    resume_list = [
        {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "phone": row[3],
            "education": row[4],
            "work_experience": row[5],
            "skills": row[6]
        }
        for row in resumes
    ]

    return jsonify(resume_list)

if __name__ == "__main__":
    app.run(debug=True)
