
import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

function formatAmount(amount: number) {
  return `₹${(amount / 100).toLocaleString("en-IN", {
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

  const transactions = await prisma.onRampTransaction.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      startTime: "desc",
    },
  });

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Transactions
      </h1>

      {transactions.length === 0 ? (
        <div className="rounded-lg border p-6 shadow">
          <p className="text-gray-600">
            No transactions found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="rounded-lg border p-5 shadow"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Add Money
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    transaction.status === "Success"
                      ? "bg-green-100 text-green-700"
                      : transaction.status === "Failure"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {transaction.status}
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold">
                {formatAmount(transaction.amount)}
              </p>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>
                  <strong>Transaction ID:</strong>{" "}
                  {transaction.id}
                </p>

                <p>
                  <strong>Provider:</strong>{" "}
                  {transaction.provider}
                </p>

                <p>
                  <strong>Reference:</strong>{" "}
                  {transaction.token}
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {formatDate(transaction.startTime)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}