'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, XCircle } from 'lucide-react';

export default function DashboardPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFilesArray: File[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'text/plain') {
        newFilesArray.push(file);
      } else {
        hasError = true;
      }
    }

    if (hasError) {
      setError('One or more files were rejected. Only .txt files are supported.'); //change this for when we find proper file types
    } else {
      setError(null);
    }

    setUploadedFiles(prevFiles => [...prevFiles, ...newFilesArray]);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    if (error) {
      setError(null);
    }
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

  const fileCount = uploadedFiles.length;

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-16 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold text-center">
          Upload Your Genetic Data
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
            accept=".txt"
            multiple
          />

          {/* error message */}
          {error && (
            <div className="mb-4 flex flex-col items-center text-red-500">
              <XCircle className="mb-2 h-10 w-10" />
              <span className="text-lg font-semibold">{error}</span>
            </div>
          )}

          {/* default upload prompt (changes based on file count) */}
          {(!error || fileCount === 0) && (
            <>
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-500" />
              <h3 className="mb-2 text-2xl font-semibold text-white">
                {fileCount > 0 ? 'Drag & Drop More Files Here' : 'Drag & Drop Your File Here'}
              </h3>
              <p className="text-gray-400">Or click to browse files</p>
              <p className="mt-4 text-sm text-gray-500">
                Supported: .txt
              </p>
            </>
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
                    <FileText className="h-5 w-5 text-green-400" />
                    <span className="truncate text-white">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.name);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    aria-label={`Remove ${file.name}`}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}