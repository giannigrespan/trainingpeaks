"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileUp, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setName(f.name.replace(/\.\w+$/, ""));
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".fit"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (name) formData.append("name", name);

      const res = await fetch("/api/activities/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Errore durante l'upload");
        setUploading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/activities/${data.data.activityId}`);
      }, 1000);
    } catch {
      setError("Errore di connessione");
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carica Attività</h1>
        <p className="text-sm text-gray-500">
          Carica un file .FIT dal tuo ciclocomputer
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : file
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-2">
                <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-green-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUp className="mx-auto h-10 w-10 text-gray-400" />
                <p className="font-medium text-gray-600">
                  {isDragActive
                    ? "Rilascia il file qui"
                    : "Trascina un file .FIT o clicca per selezionare"}
                </p>
                <p className="text-sm text-gray-400">
                  Supportato: .FIT (Garmin, Wahoo, Bryton, SRM, Stages e altri)
                </p>
              </div>
            )}
          </div>

          {/* Name input */}
          {file && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="activityName">Nome attività</Label>
              <Input
                id="activityName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Uscita mattino in gruppo"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Upload completato! Reindirizzamento...
            </div>
          )}

          {/* Upload button */}
          {file && !success && (
            <Button
              onClick={handleUpload}
              className="mt-4 w-full"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Carica e Analizza
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cosa calcoliamo</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>
              <strong>NP</strong> - Normalized Power (potenza normalizzata)
            </li>
            <li>
              <strong>IF</strong> - Intensity Factor (fattore di intensità)
            </li>
            <li>
              <strong>TSS</strong> - Training Stress Score (carico di
              allenamento)
            </li>
            <li>
              <strong>Power Curve</strong> - Miglior potenza per durata (1s -
              60min)
            </li>
            <li>
              <strong>PMC</strong> - Grafico forma/fatica/fitness (CTL/ATL/TSB)
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Bryton guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Come esportare da Bryton</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-800 mb-1">Via USB (metodo diretto)</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connetti il Bryton al PC tramite cavo USB</li>
              <li>Apri la cartella <code className="bg-gray-100 px-1 rounded text-xs">RIDE</code> sul dispositivo</li>
              <li>Copia il file <code className="bg-gray-100 px-1 rounded text-xs">.fit</code> dell&apos;allenamento</li>
              <li>Trascinalo nell&apos;area qui sopra</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-1">Via app Bryton Active</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Apri l&apos;app <strong>Bryton Active</strong> sul telefono</li>
              <li>Seleziona l&apos;attività dalla lista</li>
              <li>Tocca <strong>···</strong> → <strong>Condividi</strong> → <strong>Esporta file FIT</strong></li>
              <li>Salva il file e caricalo qui</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
