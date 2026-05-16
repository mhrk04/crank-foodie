"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { EvidenceUploader } from "@/components/evidence-uploader";
import type { CleaningLogDraft, Restaurant } from "@/lib/types";

type CleaningLogModalProps = {
  restaurant: Restaurant;
  canWrite: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (draft: CleaningLogDraft) => void;
};

export function CleaningLogModal({ restaurant, canWrite, isSubmitting, onClose, onSubmit }: CleaningLogModalProps) {
  const [cleanlinessScore, setCleanlinessScore] = useState(85);
  const [evidenceURIs, setEvidenceURIs] = useState<string[]>([]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      restaurantId: restaurant.id,
      cleanlinessScore,
      evidenceURI: evidenceURIs[0] || ""
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end overflow-y-auto bg-ink/45 p-3 sm:items-center sm:justify-center">
      <form onSubmit={submit} className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-md bg-paper p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ocean">{restaurant.area}</p>
            <h2 className="text-xl font-semibold text-ink">Log cleaning for {restaurant.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-ink hover:bg-steel" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Cleanliness score: {cleanlinessScore}
            <input
              type="range"
              min={0}
              max={100}
              value={cleanlinessScore}
              onChange={(event) => setCleanlinessScore(Number(event.target.value))}
              className="accent-leaf"
            />
          </label>
          <EvidenceUploader value={evidenceURIs} onChange={setEvidenceURIs} maxFiles={1} />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-steel px-4 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canWrite || isSubmitting}
            className="min-h-11 rounded-md bg-leaf px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
