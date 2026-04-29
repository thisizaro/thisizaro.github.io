---
title: Smart Resume Screening Project Documentation
featured: false
layout: post
excerpt: >
  
---
# Resume Processing & Interview Automation System

## Overview
This system automates the hiring workflow — from resume upload to interview scheduling.

A candidate uploads a resume through a web app. The system:
- Stores the file in Google Drive
- Extracts and analyzes content using AI
- Scores the candidate based on job requirements
- Updates application status
- Assigns interview slots (if qualified)
- Sends email notifications to candidate and admin

Everything runs inside Google Apps Script and Google Sheets — no external backend required.

---

## Workflow
1. Candidate uploads resume  
2. Entry created in Google Sheets  
3. Job added to processing queue  
4. Trigger starts processing  
5. Resume is analyzed and scored  
6. Status is updated  
7. Interview slot assigned (if eligible)  
8. Emails are sent  

---

## Scoring System
Instead of relying on a single AI score, the system uses a structured rubric:

- **Skills Match** — 40%  
- **Work Experience** — 30%  
- **Job Description Fit** — 20%  
- **Resume Structure** — 10%  

Final score is calculated using a formula in code, ensuring consistency and avoiding unreliable AI outputs.

---

## Key Modules & Functions

### `00_Config.gs`
- Stores system configuration (API keys, thresholds)
- Provides helper utilities (UUID, timestamps)

### `01_DriveSetup.gs`
- Creates and validates required Google Drive folders

### `02_SheetHelpers.gs`
- Handles sheet creation and data operations (read/write/update)

### `03_Logging.gs`
- Logs system activity
- Sends admin alerts on failures

### `04_WebApp.gs`
- Serves frontend UI
- Handles incoming HTTP requests

### `05_UploadHandler.gs`
- Validates uploaded files
- Saves resumes to Drive
- Creates application entry
- Adds job to queue

### `06_QueueProcessor.gs`
- Processes queued jobs
- Implements retry logic
- Runs via time trigger

### `07_TextExtraction.gs`
- Converts PDF/DOCX/TXT into plain text

### `08_Sanitizer.gs`
- Detects prompt injection attempts
- Cleans and validates resume text

### `09_AIExtraction.gs`
- Sends data to Groq API
- Extracts structured candidate data
- Validates AI response

### `10_ResumeProcessor.gs`
- Main pipeline controller
- Executes full processing flow

### `11_SlotAllocator.gs`
- Assigns interview slots
- Uses locking to prevent conflicts

### `12_EmailSender.gs`
- Sends candidate emails
- Sends admin notifications

### `13_Setup.gs`
- One-click setup
- Creates sheets, folders, triggers
- Adds custom menu

---

## Triggers
- **onChange Trigger** — instant processing on new entry  
- **Time-based Trigger (2 min)** — backup processing system  

---

## Application Status
- `UPLOADED` — Submitted  
- `PROCESSING` — Under evaluation  
- `DONE` — Selected and scheduled  
- `WAITLIST` — Qualified but no slots  
- `REVIEW` — Flagged for issues  
- `ERROR` — Failed after retries  

---

## Key Features
- Fully automated hiring pipeline  
- AI-powered resume analysis  
- No server required (Google ecosystem)  
- Secure API handling  
- Retry and logging system  
- Automated interview scheduling  

---

## Problems Faced & Solutions

### 1. Learning Google Apps Script
I initially had no experience with Apps Script, coming from a Python backend background.  
Understanding execution flow, triggers, and debugging in this environment took significant effort.

---

### 2. AI Scoring Issues (Groq API)
The AI initially returned **rounded and unreliable scores**.

#### Solution:
- Broke scoring into multiple categories  
- Let AI provide sub-scores instead of final score  
- Implemented a **mathematical scoring layer in code**  
- Ensured consistent and accurate evaluation  

---

### 3. Prompt Injection via Resume
Candidates attempted to manipulate the system by inserting hidden instructions inside resumes.

#### Solution:
- Built a **sanitization layer**
- Scans resumes for prompt injection patterns
- Flags suspicious resumes for review
- Applies penalties to maintain fairness  

---

### 4. Concurrency & Trigger Conflicts
Multiple triggers could process the same job simultaneously, causing inconsistencies.

#### Solution:
- Implemented **LockService-based job queue**
- Ensures only one process handles a job at a time
- Prevents race conditions and data corruption  

---

## 🔮 Future Plans

### 1. Anonymous Candidate Ranking
- Show candidates their rank among applicants  
- No personal data revealed  
- Improves transparency  

### 2. Detailed Feedback Emails
- Provide personalized improvement suggestions  
- Include:
  - Skill gaps  
  - Experience feedback  
  - Resume improvements  

---

## Tech Stack
- Google Apps Script  
- Google Sheets  
- Google Drive  
- Groq API (Llama3-70b)  

---

## Summary
This system demonstrates how a fully automated hiring pipeline can be built without traditional backend infrastructure, combining cloud tools, AI, and workflow automation.