
import prisma from "@repo/db/client";
import LogoutButton from "./LogoutButton";
import PaymentRequestForm from "./PaymentRequestForm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../lib/auth";
import RazorpayPaymentHistory from "../components/RazorpayPaymentHistory";

export const dynamic = "force-dynamic";

export default async function MerchantDashboard() {
  // Check whether the merchant is logged in
  const session = await getServerSession(authOptions);

  // If the user is not logged in, redirect to the sign-in page
  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const [transactions, banks, merchants, users] =
    await Promise.all([
      prisma.onRampTransaction.findMany({
        include: {
          user: true,
        },
        orderBy: {
          startTime: "desc",
        },
      }),

      prisma.bank.findMany({
        orderBy: {
          name: "asc",
        },
      }),

      prisma.merchant.findMany({
        orderBy: {
          id: "asc",
        },
      }),

      prisma.user.findMany({
        include: {
          Balance: true,
        },
        orderBy: {
          id: "asc",
        },
      }),
    ]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Dashboard Header */}
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#6a51a6]">
          Merchant Dashboard
        </h1>

        <LogoutButton />
      </div>

      <p className="mb-8 text-slate-600">
        Live data from PostgreSQL — on-ramp requests, users,
        banks, merchants, and Razorpay payments.
      </p>

      {/* Create Payment Request */}
      <PaymentRequestForm />

      {/* Razorpay Payment History */}
      <section className="my-10">
        <RazorpayPaymentHistory />
      </section>

      {/* Supported Banks */}
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">
          Supported Banks ({banks.length})
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <div
              key={bank.id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="font-medium">
                {bank.name}
              </div>

              <a
                href={bank.redirectUrl}
                className="break-all text-sm text-blue-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {bank.redirectUrl}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* On-Ramp Transactions */}
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">
          On-Ramp Transactions ({transactions.length})
        </h2>

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Bank</th>
                <th className="p-3">Amount (₹)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-slate-500"
                  >
                    No transactions yet
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t"
                  >
                    <td className="p-3">
                      {transaction.user.name ?? "—"}
                    </td>

                    <td className="p-3">
                      {transaction.user.number}
                    </td>

                    <td className="p-3">
                      {transaction.provider}
                    </td>

                    <td className="p-3">
                      ₹
                      {(
                        transaction.amount / 100
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                        {transaction.status}
                      </span>
                    </td>

                    <td className="p-3">
                      {transaction.startTime.toLocaleString(
                        "en-IN"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users and Merchants */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Users */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            Users ({users.length})
          </h2>

          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Balance (₹)</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-6 text-center text-slate-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t"
                    >
                      <td className="p-3">
                        {user.name ?? "—"}
                      </td>

                      <td className="p-3">
                        {user.number}
                      </td>

                      <td className="p-3">
                        ₹
                        {(
                          (user.Balance[0]?.amount ?? 0) /
                          100
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Merchants */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            Merchants ({merchants.length})
          </h2>

          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Auth</th>
                </tr>
              </thead>

              <tbody>
                {merchants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-6 text-center text-slate-500"
                    >
                      No merchants — sign in with Google
                      or run db seed
                    </td>
                  </tr>
                ) : (
                  merchants.map((merchant) => (
                    <tr
                      key={merchant.id}
                      className="border-t"
                    >
                      <td className="p-3">
                        {merchant.name ?? "—"}
                      </td>

                      <td className="p-3">
                        {merchant.email}
                      </td>

                      <td className="p-3">
                        {merchant.auth_type}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}