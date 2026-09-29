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

  // Get the page where the user should be redirected after login
  const getCallbackUrl = () => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const callbackUrl = params.get("callbackUrl");

    // Allow only internal application paths
    if (
      callbackUrl &&
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//")
    ) {
      return callbackUrl;
    }

    return "/dashboard";
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const callbackUrl = getCallbackUrl();

      const result = await signIn("credentials", {
        identifier: identifier.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(
          "Invalid email/mobile number or password"
        );
        return;
      }

      // Redirect to the original page or dashboard
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Sign-in error:", error);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const callbackUrl = getCallbackUrl();

      await signIn("google", {
        callbackUrl,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);

      setError(
        "Unable to sign in with Google. Please try again."
      );

      setGoogleLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">

        {/* Header */}
        <h1 className="mb-2 text-center text-3xl font-bold text-blue-600">
          Paytm Clone
        </h1>

        <p className="mb-6 text-center text-gray-500">
          Sign in to your account
        </p>

        {/* Credentials Login Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Email or Mobile Number */}
          <div>
            <label
              htmlFor="identifier"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email or Mobile Number
            </label>

            <input
              id="identifier"
              type="text"
              placeholder="Enter email or mobile number"
              value={identifier}
              onChange={(e) =>
                setIdentifier(e.target.value)
              }
              required
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-300" />

          <span className="text-sm text-gray-500">
            OR
          </span>

          <div className="h-px flex-1 bg-gray-300" />
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <span className="text-lg font-bold">
            G
          </span>

          {googleLoading
            ? "Signing in with Google..."
            : "Continue with Google"}
        </button>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}

          <a
            href="/signup"
            className="font-semibold text-blue-600 hover:underline"
          >
            Sign Up
          </a>
        </p>
      </div>
    </main>
  );
}