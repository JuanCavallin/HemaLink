# HemaLink

Short: HemaLink extracts a few common lab values from blood-test images and returns them as JSON.

Quick start (student-style, short):

- Frontend: Next.js app in `app/` (dev: run `npm run dev` inside `app/`).
- Backend: FastAPI in `backend/main.py` (uses OpenCV + pytesseract).

Prereqs

- Node.js (16/18+)
- Python 3.10+
- Tesseract OCR binary (required by `pytesseract`)

Setup (cross-platform)

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

Tesseract install (examples)

- macOS (Homebrew): brew install tesseract
- Ubuntu / Debian: sudo apt update && sudo apt install tesseract-ocr
- Windows: choco install tesseract  (or use the official installer)

Notes

- `backend/requirements.txt` exists and lists the Python deps used by `backend/main.py`.
- This README is intentionally short and practical.
- Want a `.env.example` or a tiny CONTRIBUTING file? I can add it.
# HemaLink

One-line: HemaLink extracts basic lab values from blood-test images and returns parsed results as JSON.

Quick start (short & simple):

- Frontend: Next.js in `app/` (dev: run `npm run dev` inside `app/`).
- Backend: FastAPI in `backend/main.py` (uses OpenCV + pytesseract).

Requirements

- Node.js (16/18+ recommended)
- Python 3.10+
- Tesseract OCR binary (required by `pytesseract`)

Setup (all OSes)

1) Clone repo

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
source .venv/bin/activate    # macOS / Linux
# on Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python backend/main.py
```

Tesseract install (quick)

- macOS (Homebrew): brew install tesseract
- Ubuntu / Debian: sudo apt update && sudo apt install tesseract-ocr
- Windows (recommended): install via Chocolatey or the Tesseract installer
	- Chocolatey: choco install tesseract
	- or use the official installer from the Tesseract project

Notes

- `backend/requirements.txt` is included. It lists fastapi, uvicorn, numpy, opencv-python, and pytesseract.
- Keep it short: this README is intentionally minimal (student-style).
- If you'd like, I can add a tiny `.env.example` or one-line CONTRIBUTING file.

Ready to commit: this README is cleaned, concise, and cross-platform.
# HemaLink
HemaLink is a small project that extracts basic lab values from uploaded blood-test images and returns parsed results.

Quick and simple:

- Frontend: Next.js app in `app/` (run with `npm run dev` inside `app/`).
- Backend: FastAPI in `backend/main.py` (uses OpenCV + pytesseract).
1) Clone:


Quick start:

- frontend: `app/` (Next.js) — run `npm run dev` inside `app/`.
- backend: `backend/main.py` (FastAPI) — run after `pip install -r backend/requirements.txt`.

Setup (macOS):

```bash
git clone https://github.com/nrebolloso/hemalink.git
cd hemalink

# frontend
cd app && npm install
npm run dev

# backend (new terminal)
cd ../
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/main.py
```

Notes: install Tesseract OCR binary (`brew install tesseract` on macOS).
cd hemalink
```

2) Frontend:

```bash
cd app
npm install
npm run dev
```

3) Backend:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/main.py
```

Notes:

- Install Tesseract OCR binary on your system (e.g. `brew install tesseract` on macOS).
- The backend requirements file `backend/requirements.txt` is included.
- This README is intentionally short — good for a quick start.

If you want, I can add a `.env.example` or a small CONTRIBUTING note.
#HemaLink
When receiving a blood test, unless you’re a doctor, it’s hard for the average person to understand what they are reading. LDL and HDL cholesterol, triglycerides, and other medical jargon is hard to understand without going into a deep internet rabbit hole. That’s where HemaLink comes in. HemaLink allows you to upload your blood test results and then gives you a score based on your results. It then gives you specific and catered advice according to this information.

### 1. Initial Setup

Clone the repository and create your virtual environment.

```bash
git clone [https://github.com/nrebolloso/hemalink](https://github.com/nrebolloso/hemalink)
cd hemalink
python3 -m venv .venv
fastapi, uvicorn, scikit-learn, pandas