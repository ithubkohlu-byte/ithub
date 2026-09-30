"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";

/**
 * Lets ANY site visitor — not just logged-in students — leave a public
 * review. Submissions still go through the same admin-approval gate as
 * student feedback (is_approved starts false), so nothing appears on the
 * site until an admin approves it in Admin → Feedback.
 */
export default function GuestReviewForm() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!message.trim()) return setError("Please write a short review.");

    setSubmitting(true);
    // No .select() here on purpose: an anonymous visitor has no read access
    // to their own just-inserted (unapproved) row under RLS, so we don't
    // try to read it back — a successful insert is confirmation enough.
    const { error: err } = await supabase.from("feedback").insert({
      is_guest: true,
      guest_name: name.trim(),
      message: message.trim(),
      rating,
    });
    setSubmitting(false);

    if (err) return setError(getErrorMessage(err));
    setDone(true);
    setName("");
    setMessage("");
    setRating(5);
  }

  if (done) {
    return (
      <div className="glass-card mx-auto max-w-xl p-6 text-center">
        <p className="font-semibold text-emerald-300">Thanks for your review!</p>
        <p className="mt-1 text-sm text-slate-400">
          It will appear on this page once our team approves it.
        </p>
        <button onClick={() => setDone(false)} className="btn-outline mt-4 !px-4 !py-2 text-xs">
          Leave another review
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card mx-auto max-w-xl p-6">
      <h3 className="mb-1 font-display text-lg font-semibold text-white">Leave a Review</h3>
      <p className="mb-4 text-xs text-slate-500">
        Visited us, or know someone who studies here? Share your experience — no account needed.
      </p>
      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <input
          className="input-field"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
              <Star size={20} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"} />
            </button>
          ))}
        </div>
        <textarea
          className="input-field h-24"
          placeholder="Tell us about your experience..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={600}
        />
        <button className="btn-primary flex items-center justify-center gap-2 !py-2.5" disabled={submitting}>
          <Send size={14} /> {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
