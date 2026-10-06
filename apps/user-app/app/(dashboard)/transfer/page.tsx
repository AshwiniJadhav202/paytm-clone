import prisma from "@repo/db/client";
import { AddMoney } from "../../../components/AddMoneyCard";
import { BalanceCard } from "../../../components/BalanceCard";
import { OnRampTransactions } from "../../../components/OnRampTransactions";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

async function getUserData() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const userId = Number(session.user.id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      balance: true,
    },
  });

  return user;
}

async function getBanks() {
  return prisma.bankAccount.findMany({
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      userId: true,
      bankName: true,
      maskedAccount: true,
      ifsc: true,
      provider: true,
      providerRef: true,
      status: true,
      isPrimary: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function getOnRampTransactions() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return [];
  }

  const userId = Number(session.user.id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return [];
  }

  const txns = await prisma.paymentAttempt.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 10,

    select: {
      id: true,
      amount: true,
      status: true,
      provider: true,
      createdAt: true,
      providerPaymentId: true,
    },
  });

  return txns.map((transaction) => ({
    time: transaction.createdAt,
    amount: transaction.amount,
    status: transaction.status,
    provider: transaction.provider,
    id: transaction.id,
    providerPaymentId: transaction.providerPaymentId,
  }));
}

export default async function TransferPage() {
  const [user, transactions, banks] =
    await Promise.all([
      getUserData(),
      getOnRampTransactions(),
      getBanks(),
    ]);

  if (!user) {
    return (
      <div className="w-full p-8">
        <h1 className="text-2xl font-bold text-red-600">
          Please sign in to continue.
        </h1>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="px-4 pt-8 md:px-8">
        <h1 className="mb-2 text-4xl font-bold text-[#6a51a6]">
          Transfer
        </h1>

        <p className="text-slate-500">
          Add money to your wallet and manage your
          balance.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 md:p-8">

        {/* Add Money */}
        <div>
          <AddMoney banks={banks} />
        </div>

        {/* Balance + Transactions */}
        <div>
          <BalanceCard
            amount={user.balance}
            locked={0}
          />

          <div className="pt-4">
            <OnRampTransactions
              transactions={transactions}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
