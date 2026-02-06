"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o password non corretti");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">CP</span>
            </div>
            <span className="text-2xl font-bold text-[var(--color-primary)]">CycloPower</span>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Accedi al tuo account
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario@esempio.it"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 caratteri"
              required
            />
            {error && (
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Accedi
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/reset-password" className="text-[var(--color-primary)] hover:underline">
              Password dimenticata?
            </Link>
          </div>
        </div>

        <p className="text-center mt-4 text-sm text-[var(--color-text-secondary)]">
          Non hai un account?{" "}
          <Link href="/register" className="text-[var(--color-primary)] hover:underline font-medium">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}
