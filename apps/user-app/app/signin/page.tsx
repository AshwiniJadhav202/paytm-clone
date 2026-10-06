"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // =========================
  // Credentials Login
  // =========================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier: identifier.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email/mobile number or password");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Credentials login error:", error);
      setError("Something went wrong while signing in");
      setLoading(false);
    }
  };

  // =========================
  // Google Login
  // =========================
  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const result = await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: false,
      });

      console.log("Google sign-in result:", result);

      if (result?.error) {
        setError(`Google login failed: ${result.error}`);
        setGoogleLoading(false);
        return;
      }

      if (result?.url) {
        window.location.href = result.url;
        return;
      }

      setError("Unable to start Google login");
      setGoogleLoading(false);
    } catch (error) {
      console.error("Google login error:", error);
      setError("Something went wrong while connecting to Google");
      setGoogleLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">

        {/* Heading */}
        <h1 className="mb-2 text-center text-3xl font-bold text-blue-600">
          Paytm Clone
        </h1>

        <p className="mb-6 text-center text-gray-500">
          Sign in to your account
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Credentials Login */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email / Mobile */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email or Mobile Number
            </label>

            <input
              type="text"
              placeholder="Enter email or mobile number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading || googleLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || googleLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* OR */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-300" />

          <span className="text-sm text-gray-500">
            OR
          </span>

          <div className="h-px flex-1 bg-gray-300" />
        </div>

        {/* Google Login */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
        >
          <span className="text-lg font-bold">
            G
          </span>

          {googleLoading
            ? "Connecting..."
            : "Continue with Google"}
        </button>

        {/* Signup */}
        <p className="mt-6 text-center text-sm text-gray-500">
          New user?{" "}
          <a
            href="/signup"
            className="font-semibold text-blue-600 hover:underline"
          >
            Create an account
          </a>
        </p>

      </div>
    </main>
  );
}
