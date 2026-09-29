
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { authOptions } from "../../lib/auth";
import RazorpayCheckout from "../../components/RazorpayCheckout";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/signin");
  }

  const userId = session.user.id;
  const userName = session.user.name || "User";

  // Use your computer's local network IP for phone testing.
  // Example: http://192.168.1.10:3001
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  // Web-based QR payment URL
  const qrValue = `${appUrl}/pay/user/${userId}`;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">

        <h1 className="mb-2 text-3xl font-bold text-gray-800">
          Welcome, {userName}
        </h1>

        <p className="mb-8 text-gray-500">
          Manage your payments and account
        </p>

        <div className="grid gap-6 md:grid-cols-2">

          {/* QR Code Section */}
          <div className="rounded-2xl bg-white p-6 text-center shadow-lg">

            <h2 className="mb-2 text-xl font-bold text-gray-800">
              My QR Code
            </h2>

            <p className="mb-6 text-sm text-gray-500">
              Scan to pay this user
            </p>

            <div className="flex justify-center rounded-xl border bg-white p-4">
              <QRCodeSVG
                value={qrValue}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="mt-4 font-semibold text-gray-700">
              {userName}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              User ID: {userId}
            </p>

            <p className="mt-4 break-all text-xs text-gray-500">
              {qrValue}
            </p>

          </div>

          {/* Razorpay Section */}
          <div>
            <RazorpayCheckout />
          </div>

        </div>

      </div>
    </main>
  );
}