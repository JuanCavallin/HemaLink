'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, XCircle, Loader2, FileImage } from 'lucide-react';

export default function DashboardPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null); //local file type and size validation
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null); //fastAPI server errors
  const [uploadSuccess, setUploadSuccess] = useState<any>(null); //server success response

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'text/plain',
    'image/png',
    'image/jpeg' 
  ];

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFilesArray: File[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (allowedTypes.includes(file.type)) {
        newFilesArray.push(file);
      } else {
        hasError = true;
      }
    }

    if (hasError) {
      setError('One or more files were rejected. Only .txt, .png, and .jpg files are supported.');
    } else {
      setError(null);
    }
    
    setUploadError(null); 
    setUploadSuccess(null);

    setUploadedFiles(prevFiles => [...prevFiles, ...newFilesArray]);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    if (error) {
      setError(null);
    }
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const onBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null); 

    const FASTAPI_URL = 'http://127.0.0.1:8000/uploadfiles/'; //back end server (may need to change)

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file); 
    });

    try {
      const response = await fetch(FASTAPI_URL, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || result.message || `Server error: ${response.statusText}`);
      }

      console.log('Upload successful:', result);
      setUploadSuccess(result);
      setUploadedFiles([]);

    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(`Upload failed: ${err.message}. Please check your FastAPI server is running.`);
    } finally {
      setIsUploading(false);
    }
  };

  const fileCount = uploadedFiles.length;

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-16 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold text-center">
          Upload Your Lab Test Results
        </h1>
        <h2 className="mb-8 text-2xl text-center text-gray-400">
          For Auto Disease Ranking
        </h2>

        {/* drag and drop file upload */}
        <div
          className={`rounded-lg border-2 border-dashed bg-gray-800 p-12 text-center transition-all duration-200
            ${
              fileCount > 0
                ? 'border-blue-500'
                : 'border-gray-600'
            }
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={onBrowseClick}
          style={{ cursor: 'pointer' }}
        >
          {/* hidden file for functionality */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="text/plain,image/png,image/jpeg"
            multiple
          />

          {/* error message from frontend validation */}
          {error && (
            <div className="mb-4 flex flex-col items-center text-red-500">
              <XCircle className="mb-2 h-10 w-10" />
              <span className="text-lg font-semibold">{error}</span>
            </div>
          )}
          
          {/* error message from backend upload/processing */}
          {uploadError && (
            <div className="mb-4 flex flex-col items-center text-red-500">
              <XCircle className="mb-2 h-10 w-10" />
              <span className="text-lg font-semibold">{uploadError}</span>
            </div>
          )}

          {(!error && !uploadError && !uploadSuccess || fileCount === 0) && (
            <>
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-500" />
              <h3 className="mb-2 text-2xl font-semibold text-white">
                {fileCount > 0 ? 'Drag & Drop More Files Here' : 'Drag & Drop Your File Here'}
              </h3>
              <p className="text-gray-400">Or click to browse files</p>
              <p className="mt-4 text-sm text-gray-500">
                Supported: .txt, .png, .jpg, .jpeg
              </p>
            </>
          )}

           {/* fastAPI success message */}
           {uploadSuccess && (
            <div className="mb-4 flex flex-col items-center text-green-500">
              <span className="text-lg font-semibold">Upload Complete!</span>
              <p className="text-sm text-green-300 mt-1">Ready for the next analysis.</p>
            </div>
          )}
        </div>

        {/* list of uploaded files */}
        {fileCount > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-xl font-semibold">Uploaded Files ({fileCount})</h3>
            <div className="rounded-lg bg-gray-800 p-4">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-gray-700 py-2 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    {/* icon rendering */}
                    {file.type.startsWith('image/') ? (
                      <FileImage className="h-5 w-5 text-blue-400" />
                    ) : (
                      <FileText className="h-5 w-5 text-green-400" />
                    )}
                    <span className="truncate text-white">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.name);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    aria-label={`Remove ${file.name}`}
                    disabled={isUploading}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload ${fileCount} File(s)`
                )}
              </button>
            </div>

          </div>
        )}
        
        {/* fastAPI response display */}
        {uploadSuccess && (
            <div className="mt-8">
                <h3 className="text-2xl font-semibold text-green-400 mb-4">FastAPI Confirmation</h3>
                <div className="rounded-lg bg-gray-900 p-6 text-green-300 overflow-x-auto">
                    <pre className='whitespace-pre-wrap'>
                      {JSON.stringify(uploadSuccess, null, 2)}
                    </pre>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}