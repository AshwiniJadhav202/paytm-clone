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

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="w-full p-8">
        <h1 className="text-2xl font-bold text-red-600">
          Please sign in to view history.
        </h1>
      </div>
    );
  }

  const userId = Number(session.user.id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return (
      <div className="w-full p-8">
        <h1 className="text-2xl font-bold text-red-600">
          Invalid user session.
        </h1>
      </div>
    );
  }

  // Fetch P2P transactions and bank/payment transactions
  // from the models that actually exist in the current Prisma schema.
  const [p2pTransactions, bankTransactions] =
    await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [
            {
              senderId: userId,
            },
            {
              receiverId: userId,
            },
          ],
        },

        include: {
          User_Transaction_senderIdToUser: {
            select: {
              name: true,
              number: true,
            },
          },

          User_Transaction_receiverIdToUser: {
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

      prisma.paymentAttempt.findMany({
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
      }),
    ]);

  const transactions = [
    // ==========================================
    // P2P TRANSACTIONS
    // ==========================================
    ...p2pTransactions.map((transaction) => {
      const isSent = transaction.senderId === userId;

      const otherUser = isSent
        ? transaction.User_Transaction_receiverIdToUser
        : transaction.User_Transaction_senderIdToUser;

      return {
        id: `p2p-${transaction.id}`,

        type: "P2P",

        title: isSent
          ? "Money Sent"
          : "Money Received",

        description: isSent
          ? `To: ${otherUser.name || "Unknown User"}`
          : `From: ${otherUser.name || "Unknown User"}`,

        number:
          otherUser.number ||
          "Mobile number unavailable",

        amount: transaction.amount,

        isCredit: !isSent,

        status: "SUCCESS",

        date: transaction.createdAt,
      };
    }),

    // ==========================================
    // BANK / ADD MONEY TRANSACTIONS
    // ==========================================
    ...bankTransactions.map((transaction) => {
      const bankName =
        transaction.BankAccount?.bankName ||
        "Bank Account";

      const maskedAccount =
        transaction.BankAccount?.maskedAccount ||
        "Account unavailable";

      return {
        id: `bank-${transaction.id}`,

        type: "BANK",

        title:
          transaction.status === "SUCCESS"
            ? "Money Added"
            : "Add Money",

        description: `From ${bankName}`,

        number: maskedAccount,

        amount: transaction.amount,

        isCredit: true,

        status: transaction.status,

        date: transaction.createdAt,
      };
    }),
  ].sort(
    (a, b) =>
      b.date.getTime() - a.date.getTime()
  );

  return (
    <div className="w-full p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Transaction History
        </h1>

        <p className="mt-2 text-slate-500">
          View your sent, received, and added money
          transactions.
        </p>
      </div>

      {/* No Transactions */}
      {transactions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-700">
            No transactions yet
          </h2>

          <p className="mt-2 text-slate-500">
            Your transactions will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Table Header */}
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-slate-800">
              All Transactions
            </h2>
          </div>

          {/* Transactions */}
          <div className="divide-y divide-slate-200">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left Section */}
                <div className="flex items-center gap-4">

                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
                      transaction.isCredit
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {transaction.type === "BANK"
                      ? "+"
                      : transaction.isCredit
                        ? "↓"
                        : "↑"}
                  </div>

                  {/* Details */}
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {transaction.title}
                    </h3>

                    <p className="text-sm text-slate-700">
                      {transaction.description}
                    </p>

                    <p className="text-sm text-slate-500">
                      {transaction.number}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>

                {/* Right Section */}
                <div className="text-left sm:text-right">

                  {/* Amount */}
                  <p
                    className={`text-lg font-bold ${
                      transaction.isCredit
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.isCredit
                      ? "+"
                      : "-"}

                    {formatAmount(
                      transaction.amount
                    )}
                  </p>

                  {/* Status */}
                  <p className="mt-1 text-sm text-slate-500">
                    {transaction.status ===
                    "SUCCESS"
                      ? transaction.type ===
                        "BANK"
                        ? "Added to Wallet"
                        : transaction.isCredit
                          ? "Credited"
                          : "Debited"
                      : transaction.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
