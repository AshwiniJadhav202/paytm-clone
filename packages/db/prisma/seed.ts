import { PrismaClient } from '@prisma/client'
import bcrypt from "bcrypt";

const prisma = new PrismaClient()

const BANKS = [
  {
    name: "HDFC Bank",
    redirectUrl: "https://www.hdfc.bank.in/",
  },
  {
    name: "Axis Bank",
    redirectUrl: "https://www.axis.bank.in/",
  },
  {
    name: "State Bank of India",
    redirectUrl: "https://sbi.bank.in/",
  },
  {
    name: "Canara Bank",
    redirectUrl: "https://www.canarabank.bank.in/",
  },
  {
    name: "ICICI Bank",
    redirectUrl: "https://www.icici.bank.in/",
  },
  {
    name: "Punjab National Bank",
    redirectUrl: "https://pnb.bank.in/",
  },
];

async function main() {
  for (const bank of BANKS) {
    await prisma.bank.upsert({
      where: { name: bank.name },
      update: { redirectUrl: bank.redirectUrl },
      create: bank,
    });
  }

  const alice = await prisma.user.upsert({
    where: { number: '7028786380' },
    update: {},
    create: {
      number: '7028786380',
      password: await bcrypt.hash('ashwini', 10),
      name: 'ashwini',
      Balance: {
        create: {
            amount: 20000,
            locked: 0
        }
      },
      OnRampTransaction: {
        create: {
          startTime: new Date(),
          status: "Success",
          amount: 20000,
          token: "token__1",
          provider: "Canara Bank",
        },
      },
    },
  })
  const bob = await prisma.user.upsert({
    where: { number: '7350487813' },
    update: {},
    create: {
      number: '7350487813',
      password: await bcrypt.hash('yash', 10),
      name: 'yash',
      Balance: {
        create: {
            amount: 2000,
            locked: 0
        }
      },
      OnRampTransaction: {
        create: {
          startTime: new Date(),
          status: "Failure",
          amount: 2000,
          token: "token__2",
          provider: "HDFC Bank",
        },
      },
    },
  })

  await prisma.merchant.upsert({
    where: { email: "ashwini22022004@gmail.com" },
    update: {},
    create: {
      email: "ashwini22022004@gmail.com",
      name: "Ashwini Jadhav",
      auth_type: "Google",
    },
  });

  console.log({ banks: BANKS.length, alice, bob })
}
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
