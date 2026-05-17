"use client";

import { ChangeEvent, useState } from "react";
import { useAccount } from "wagmi";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type EvidenceUploaderProps = {
  value: string[];
  onChange: (value: string[]) => void;
  maxFiles?: number;
};

export function EvidenceUploader({ value, onChange, maxFiles = 3 }: EvidenceUploaderProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const { isConnected } = useAccount();

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, maxFiles - value.length));
    if (files.length === 0) {
      setStatus("error");
      setMessage(`Maximum ${maxFiles} images per review`);
      return;
    }

    setStatus("uploading");
    setMessage("");

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("file", file);
      }

      const response = await fetch("/api/pinata", {
        method: "POST",
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      const uploadedUris = Array.isArray(result.uris) ? result.uris : [result.uri].filter(Boolean);
      onChange([...value, ...uploadedUris].slice(0, maxFiles));
      setStatus("done");
      setMessage(`${uploadedUris.length} image${uploadedUris.length === 1 ? "" : "s"} pinned to IPFS`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed");
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink" htmlFor="evidence-uri">
        Review images
      </label>
      <div className="grid gap-2">
        {[0, 1, 2].slice(0, maxFiles).map((index) => (
          <div key={index} className="flex gap-2">
            <input
              id={index === 0 ? "evidence-uri" : undefined}
              value={value[index] || ""}
              onChange={(event) => {
                const next = [...value];
                if (event.target.value) next[index] = event.target.value;
                else next.splice(index, 1);
                onChange(next.filter(Boolean).slice(0, maxFiles));
              }}
              placeholder={`ipfs://image-${index + 1}`}
              className="min-h-11 flex-1 rounded-md border border-steel bg-white px-3 text-sm outline-none focus:shadow-focus"
            />
            {value[index] ? (
              <button
                type="button"
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                className="min-h-11 rounded-md border border-steel px-3 text-sm font-semibold"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <label className={cn("inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white", (status === "uploading" || !isConnected) && "opacity-70 cursor-not-allowed")}>
          <UploadCloud size={18} />
          <span>{status === "uploading" ? "Uploading" : `Upload images (${value.length}/${maxFiles})`}</span>
          <input className="sr-only" type="file" accept="image/*" multiple onChange={uploadFile} disabled={status === "uploading" || value.length >= maxFiles || !isConnected} />
        </label>
      </div>
      {!isConnected ? (
        <p className="text-xs text-tomato">Connect your wallet to upload images.</p>
      ) : message ? (
        <p className={cn("text-xs", status === "error" ? "text-tomato" : "text-leaf")}>{message}</p>
      ) : null}
    </div>
  );
}
