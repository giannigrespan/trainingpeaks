"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function FileUpload() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError("");
    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);

      const res = await fetch("/api/activities/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Errore durante il caricamento");
        setUploading(false);
        setProgress(0);
        return;
      }

      setProgress(100);
      router.push(`/activities/${data.data.activityId}`);
    } catch {
      setError("Errore di connessione");
      setUploading(false);
      setProgress(0);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".fit"],
      "application/gpx+xml": [".gpx"],
      "application/vnd.garmin.tcx+xml": [".tcx"],
    },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-[var(--color-primary)] bg-blue-50"
            : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {isDragActive ? (
            <p className="text-[var(--color-primary)] font-medium">Rilascia il file qui</p>
          ) : (
            <>
              <p className="text-[var(--color-text-primary)] font-medium">
                Trascina il file o clicca per selezionare
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Supporta .FIT, .GPX, .TCX (max 50MB)
              </p>
            </>
          )}
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
            <div
              className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            {progress < 80 ? "Caricamento e analisi..." : "Quasi fatto..."}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-error)]">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            Riprova
          </Button>
        </div>
      )}
    </div>
  );
}
