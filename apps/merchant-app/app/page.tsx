import prisma from "@repo/db/client";
import LogoutButton from "./LogoutButton";
import PaymentRequestForm from "./PaymentRequestForm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../lib/auth";
import RazorpayPaymentHistory from "../components/RazorpayPaymentHistory";

export const dynamic = "force-dynamic";

export default async function MerchantDashboard() {
  // ==========================================
  // Check whether merchant is logged in
  // ==========================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // ==========================================
  // Find logged-in merchant
  // ==========================================

  const merchant = await prisma.merchant.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!merchant) {
    redirect("/api/auth/signin");
  }

  // ==========================================
  // Fetch dashboard data
  // ==========================================

  const [
    payments,
    paymentAttempts,
    bankAccounts,
    merchants,
    users,
  ] = await Promise.all([
    // ----------------------------------------
    // Successful payments received by merchant
    // ----------------------------------------

    prisma.payment.findMany({
      where: {
        merchantId: merchant.id,
        status: "SUCCESS",
      },

      include: {
        User: {
          select: {
            name: true,
            number: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    // ----------------------------------------
    // Payment Attempts
    // ----------------------------------------

    prisma.paymentAttempt.findMany({
      include: {
        User: {
          select: {
            name: true,
            number: true,
          },
        },

        BankAccount: {
          select: {
            bankName: true,
            maskedAccount: true,
            provider: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    // ----------------------------------------
    // Bank Accounts
    // ----------------------------------------

    prisma.bankAccount.findMany({
      include: {
        User: {
          select: {
            name: true,
            number: true,
          },
        },
      },

      orderBy: {
        bankName: "asc",
      },
    }),

    // ----------------------------------------
    // All Merchants
    // ----------------------------------------

    prisma.merchant.findMany({
      orderBy: {
        id: "asc",
      },
    }),

    // ----------------------------------------
    // All Users
    // ----------------------------------------

    prisma.user.findMany({
      orderBy: {
        id: "asc",
      },
    }),
  ]);

  // ==========================================
  // Calculate total received
  // ==========================================

  const totalReceived = payments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  // ==========================================
  // Dashboard
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 p-8">

      {/* ========================================
          Dashboard Header
      ======================================== */}

      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#6a51a6]">
          Merchant Dashboard
        </h1>

        <LogoutButton />
      </div>

      <p className="mb-8 text-slate-600">
        Live data from PostgreSQL — payments, payment
        attempts, bank accounts, users, merchants,
        and Razorpay payments.
      </p>

      {/* ========================================
          Logged-in Merchant Information
      ======================================== */}

      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">
          Logged-in Merchant
        </p>

        <p className="mt-1 text-lg font-semibold">
          {merchant.name ?? "Merchant"}
        </p>

        <p className="text-sm text-slate-600">
          {merchant.email}
        </p>
      </div>

      {/* ========================================
          Summary Cards
      ======================================== */}

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-4">

        {/* Merchant Balance */}

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Merchant Balance
          </p>

          <p className="mt-2 text-2xl font-bold text-[#6a51a6]">
            ₹{merchant.balance.toLocaleString("en-IN")}
          </p>
        </div>

        {/* Successful Payments */}

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Successful Payments
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {payments.length}
          </p>
        </div>

        {/* Total Received */}

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Received
          </p>

          <p className="mt-2 text-2xl font-bold text-[#6a51a6]">
            ₹{totalReceived.toLocaleString("en-IN")}
          </p>
        </div>

        {/* Registered Users */}

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Registered Users
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-600">
            {users.length}
          </p>
        </div>
      </div>

      {/* ========================================
          Create Payment Request
      ======================================== */}

      <PaymentRequestForm />

      {/* ========================================
          Razorpay Payment History
      ======================================== */}

      <section className="my-10">
        <RazorpayPaymentHistory />
      </section>

      {/* ========================================
          Successful Merchant Payments
      ======================================== */}

      <section className="mb-10">

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Successful Merchant Payments (
            {payments.length})
          </h2>

          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Received
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full text-sm">

            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment Time</th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-slate-500"
                  >
                    No successful merchant payments yet
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t"
                  >
                    <td className="p-3">
                      {payment.User?.name ??
                        "Unknown User"}
                    </td>

                    <td className="p-3">
                      {payment.User?.number ?? "—"}
                    </td>

                    <td className="p-3 font-semibold text-green-600">
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </td>

                    <td className="p-3">
                      {payment.method ?? "—"}
                    </td>

                    <td className="p-3">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        {payment.status}
                      </span>
                    </td>

                    <td className="p-3">
                      {payment.createdAt.toLocaleString(
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

      {/* ========================================
          Payment Attempts
      ======================================== */}

      <section className="mb-10">

        <h2 className="mb-3 text-xl font-semibold">
          Payment Attempts ({paymentAttempts.length})
        </h2>

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full text-sm">

            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Bank</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Status</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>

            <tbody>
              {paymentAttempts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-slate-500"
                  >
                    No payment attempts yet
                  </td>
                </tr>
              ) : (
                paymentAttempts.map((attempt) => (
                  <tr
                    key={attempt.id}
                    className="border-t"
                  >
                    <td className="p-3">
                      {attempt.User?.name ?? "—"}
                    </td>

                    <td className="p-3">
                      {attempt.User?.number ?? "—"}
                    </td>

                    <td className="p-3">
                      {attempt.BankAccount?.bankName ?? "—"}

                      {attempt.BankAccount?.maskedAccount
                        ? ` (${attempt.BankAccount.maskedAccount})`
                        : ""}
                    </td>

                    <td className="p-3 font-semibold">
                      ₹{attempt.amount.toLocaleString("en-IN")}
                    </td>

                    <td className="p-3">
                      {attempt.provider}
                    </td>

                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                        {attempt.status}
                      </span>
                    </td>

                    <td className="p-3">
                      {attempt.createdAt.toLocaleString(
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

      {/* ========================================
          Bank Accounts
      ======================================== */}

      <section className="mb-10">

        <h2 className="mb-3 text-xl font-semibold">
          Linked Bank Accounts ({bankAccounts.length})
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">

          {bankAccounts.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-slate-500">
              No bank accounts found
            </div>
          ) : (
            bankAccounts.map((bankAccount) => (
              <div
                key={bankAccount.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >

                <div className="mb-2 font-semibold">
                  {bankAccount.bankName}
                </div>

                <div className="text-sm text-slate-600">
                  Account: {bankAccount.maskedAccount}
                </div>

                <div className="text-sm text-slate-600">
                  User: {bankAccount.User?.name ?? "—"}
                </div>

                <div className="text-sm text-slate-600">
                  Phone: {bankAccount.User?.number ?? "—"}
                </div>

                <div className="mt-2">
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    {bankAccount.status}
                  </span>
                </div>

              </div>
            ))
          )}

        </div>
      </section>

      {/* ========================================
          Users and Merchants
      ======================================== */}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

        {/* ======================================
            Users
        ====================================== */}

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
                  <th className="p-3">Email</th>
                  <th className="p-3">Balance</th>
                </tr>
              </thead>

              <tbody>

                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
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
                        {user.email ?? "—"}
                      </td>

                      <td className="p-3 font-medium">
                        ₹{user.balance.toLocaleString("en-IN")}
                      </td>

                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>
        </section>

        {/* ======================================
            Merchants
        ====================================== */}

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
                  <th className="p-3">Balance</th>
                </tr>
              </thead>

              <tbody>

                {merchants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-slate-500"
                    >
                      No merchants found
                    </td>
                  </tr>
                ) : (
                  merchants.map((merchantItem) => (
                    <tr
                      key={merchantItem.id}
                      className="border-t"
                    >

                      <td className="p-3">
                        {merchantItem.name ?? "—"}
                      </td>

                      <td className="p-3">
                        {merchantItem.email}
                      </td>

                      <td className="p-3">
                        {merchantItem.auth_type}
                      </td>

                      <td className="p-3 font-medium">
                        ₹
                        {merchantItem.balance.toLocaleString(
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

      </div>
    </div>
  );
}