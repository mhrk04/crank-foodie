"use client";

import { FormEvent, useState } from "react";
import { Star, X } from "lucide-react";
import { EvidenceUploader } from "@/components/evidence-uploader";
import { reportTypeOptions } from "@/lib/contract";
import type { ReportDraft, ReportTypeKey, Restaurant } from "@/lib/types";

type ReportModalProps = {
  restaurant: Restaurant;
  canWrite: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (draft: ReportDraft) => void;
};

export function ReportModal({ restaurant, canWrite, isSubmitting, onClose, onSubmit }: ReportModalProps) {
  const [reportType, setReportType] = useState<ReportTypeKey>("PestObject");
  const [severity, setSeverity] = useState(3);
  const [starRating, setStarRating] = useState(3);
  const [evidenceURIs, setEvidenceURIs] = useState<string[]>([]);
  const [detailsURI, setDetailsURI] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      restaurantId: restaurant.id,
      reportType,
      severity,
      starRating,
      evidenceURIs,
      detailsURI
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end overflow-y-auto bg-ink/45 p-3 sm:items-center sm:justify-center">
      <form onSubmit={submit} className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-md bg-paper p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ocean">{restaurant.area}</p>
            <h2 className="text-xl font-semibold text-ink">Submit review for {restaurant.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-ink hover:bg-steel" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Report type
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportTypeKey)}
              className="min-h-11 rounded-md border border-steel bg-white px-3 outline-none focus:shadow-focus"
            >
              {reportTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Severity: {severity}
            <input
              type="range"
              min={1}
              max={5}
              value={severity}
              onChange={(event) => setSeverity(Number(event.target.value))}
              className="accent-leaf"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Restaurant rating
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setStarRating(rating)}
                  className="flex h-11 w-11 items-center justify-center rounded-md border border-steel bg-white text-amber transition hover:border-amber focus:shadow-focus"
                  aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                >
                  <Star size={20} fill={rating <= starRating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </label>

          <EvidenceUploader value={evidenceURIs} onChange={setEvidenceURIs} maxFiles={3} />

          <label className="grid gap-2 text-sm font-medium text-ink">
            Details URI
            <input
              value={detailsURI}
              onChange={(event) => setDetailsURI(event.target.value)}
              placeholder="ipfs://metadata-json"
              className="min-h-11 rounded-md border border-steel bg-white px-3 text-sm outline-none focus:shadow-focus"
            />
          </label>
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
