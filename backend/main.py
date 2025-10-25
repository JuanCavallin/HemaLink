from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/uploadfiles/")
async def create_upload_files(files: List[UploadFile] = File(...)):
    """
    Receives one or more files from the frontend.
    Prints the filename of each file to the terminal.
    """
    
    print("--- Files Received by Python ---")
    
    filenames = []
    for file in files:
        print(f"File Name: {file.filename}, Type: {file.content_type}")
        filenames.append(file.filename)
        
    print("----------------------------------")

    return {
        "message": f"Python backend successfully received {len(filenames)} file(s).",
        "received_filenames": filenames
    }

if __name__ == "__main__":
    # to run front end terminal: uvicorn backend.main:app --reload --port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)