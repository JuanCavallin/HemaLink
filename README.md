# HemaLink

**HemaLink** helps users make sense of their blood test results.  
Medical terms like *LDL, HDL, or triglycerides* can be confusing — HemaLink makes them simple.  
Upload your blood test report and receive an overall health score, along with clear, personalized advice.

---

## Features

-  Upload PDF or image blood test reports  
-  Automatic OCR data extraction using **OpenCV + Tesseract**  
-  Generate a personalized **health score** based on key biomarkers  
-  Receive **AI-driven recommendations** for improvement  
-  Full-stack web app powered by **Next.js + FastAPI**

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | Next.js (React 18) |
| Backend | FastAPI |
| OCR | OpenCV + Tesseract |
| Languages | Python 3.10+, Node.js 16/18+ |

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or v18+)
- [Python 3.10+](https://www.python.org/downloads/)
- [Tesseract OCR](https://tesseract-ocr.github.io/tessdoc/Installation.html)

### Tesseract Install Examples

- **macOS:** `brew install tesseract`
- **Ubuntu / Debian:** `sudo apt update && sudo apt install tesseract-ocr`
- **Windows:** `choco install tesseract` *(or use the official installer)*

---

## Setup (Cross-Platform)

1) Clone

```bash
git clone https://github.com/nrebolloso/hemalink.git
cd hemalink
```

2) Frontend

```bash
cd app
npm install
npm run dev
```

3) Backend (new terminal)

```bash
cd ../
python3 -m venv .venv
source .venv/bin/activate   # macOS / Linux
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python backend/main.py
```

