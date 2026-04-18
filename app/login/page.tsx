"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="min-h-screen bg-sidebar text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-accent rounded-full" />
            <span className="mono text-xs tracking-widest text-white/60 uppercase">
              Attomik HQ
            </span>
          </div>
          <h1 className="text-5xl font-heading font-extrabold tracking-tight">
            Sign in.
          </h1>
          <p className="mt-3 text-white/60">
            We'll email you a magic link.
          </p>
        </div>

        {status === "sent" ? (
          <div className="border border-accent/40 bg-accent/10 p-6">
            <p className="mono text-xs uppercase tracking-widest text-accent mb-2">
              Check your email
            </p>
            <p className="text-white/80">
              Magic link sent to <span className="mono">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mono text-[10px] uppercase tracking-widest text-white/50 block mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@attomik.co"
                className="w-full bg-transparent border border-white/20 focus:border-accent outline-none px-4 py-3 mono text-sm placeholder:text-white/30"
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-accent text-black font-semibold py-3 hover:brightness-95 disabled:opacity-50 transition"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>

            {error && (
              <p className="mono text-xs text-red-400">{error}</p>
            )}
          </form>
        )}

        <p className="mt-12 mono text-[10px] uppercase tracking-widest text-white/30">
          hq.attomik.co
        </p>
      </div>
    </main>
  );
}
