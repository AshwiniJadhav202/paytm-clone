import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status: string) {
  switch (status) {
    case "SUCCESS":
      return "bg-green-100 text-green-700";

    case "FAILED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">
          Please sign in to view transactions
        </h1>
      </div>
    );
  }

  const userId = Number(session.user.id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">
          Invalid user session
        </h1>
      </div>
    );
  }

  const transactions =
    await prisma.paymentAttempt.findMany({
      where: {
        userId,
      },

      include: {
        BankAccount: {
          select: {
            bankName: true,
            maskedAccount: true,
            ifsc: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">
          Transactions
        </h1>

        <p className="mt-2 text-slate-500">
          View your wallet funding and bank transactions.
        </p>
      </div>

      {/* No Transactions */}
      {transactions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow">
          <p className="text-gray-600">
            No transactions found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              {/* Top Row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Add Money
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {transaction.provider}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                    transaction.status
                  )}`}
                >
                  {transaction.status}
                </span>
              </div>

              {/* Amount */}
              <p className="mt-4 text-2xl font-bold text-slate-800">
                {formatAmount(transaction.amount)}
              </p>

              {/* Details */}
              <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p>
                  <strong>Transaction ID:</strong>{" "}
                  {transaction.id}
                </p>

                <p>
                  <strong>Provider:</strong>{" "}
                  {transaction.provider}
                </p>

                {transaction.providerPaymentId && (
                  <p>
                    <strong>Payment Reference:</strong>{" "}
                    {transaction.providerPaymentId}
                  </p>
                )}

                {transaction.BankAccount && (
                  <>
                    <p>
                      <strong>Bank:</strong>{" "}
                      {transaction.BankAccount.bankName}
                    </p>

                    <p>
                      <strong>Account:</strong>{" "}
                      {transaction.BankAccount.maskedAccount}
                    </p>

                    {transaction.BankAccount.ifsc && (
                      <p>
                        <strong>IFSC:</strong>{" "}
                        {transaction.BankAccount.ifsc}
                      </p>
                    )}
                  </>
                )}

                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(transaction.createdAt)}
                </p>
              </div>

              {/* Status Description */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-500">
                  {transaction.status === "SUCCESS"
                    ? "Money added successfully to your wallet."
                    : transaction.status === "FAILED"
                      ? "The transaction failed."
                      : "The transaction is currently pending."}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
