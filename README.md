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

## Installation

We recommend using Docker for the simplest setup, but instructions for manual installation are provided below.

### Quick Start (Recommended with Docker)

This method uses Docker Compose to build and run both the FastAPI backend and Next.js frontend services with a single command.

1.  **Prerequisites:** Ensure you have **Docker** and **Docker Compose** installed.
2.  **Clone the Repo:**
    ```bash
    git clone [https://github.com/nrebolloso/hemalink.git](https://github.com/nrebolloso/hemalink.git)
    cd hemalink
    ```
3.  **Run Application:**
    ```bash
    docker compose up --build
    ```

The application will be accessible at `http://localhost:3000`.

---

## Prerequisites (Manual Setup)

- [Node.js](https://nodejs.org/) (v16 or v18+)
- [Python 3.10+](https://www.python.org/downloads/)
- [Tesseract OCR](https://tesseract-ocr.github.io/tessdoc/Installation.html) (Required for the backend to perform OCR)

### Tesseract Install Examples

- **macOS:** `brew install tesseract`
- **Ubuntu / Debian:** `sudo apt update && sudo apt install tesseract-ocr`
- **Windows:** `choco install tesseract` *(or use the official installer)*

---

## Manual Setup (For Development)

1) Clone

```bash
git clone [https://github.com/nrebolloso/hemalink.git](https://github.com/nrebolloso/hemalink.git)
cd hemalink```

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

