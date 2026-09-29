import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../lib/auth";
import prisma from "@repo/db/client";
import QRPaymentForm from "../../../../components/QRPaymentForm";

type PageProps = {
    params: {
        userId: string;
    };
};

export default async function QRPaymentPage({
    params,
}: PageProps) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect(
            `/signin?callbackUrl=/pay/user/${params.userId}`
        );
    }

    const receiverId = Number(params.userId);

    if (!Number.isInteger(receiverId) || receiverId <= 0) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
                <div className="rounded-xl bg-white p-6 text-center shadow">
                    <h1 className="text-xl font-bold text-red-600">
                        Invalid User
                    </h1>
                    <p className="mt-2 text-gray-600">
                        The QR code contains an invalid user ID.
                    </p>
                </div>
            </main>
        );
    }

    const receiver = await prisma.user.findUnique({
        where: {
            id: receiverId,
        },
        select: {
            id: true,
            name: true,
            number: true,
        },
    });

    if (!receiver) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
                <div className="rounded-xl bg-white p-6 text-center shadow">
                    <h1 className="text-xl font-bold text-red-600">
                        User Not Found
                    </h1>
                    <p className="mt-2 text-gray-600">
                        This QR code belongs to an unavailable user.
                    </p>
                </div>
            </main>
        );
    }

    const currentUserId = Number(session.user.id);

    if (currentUserId === receiver.id) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
                <div className="rounded-xl bg-white p-6 text-center shadow">
                    <h1 className="text-xl font-bold text-gray-800">
                        Your Own QR Code
                    </h1>
                    <p className="mt-2 text-gray-600">
                        You cannot send money to yourself.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
            <div className="w-full max-w-md">
                <QRPaymentForm
                    receiverId={receiver.id}
                    receiverName={receiver.name || "User"}
                    receiverNumber={receiver.number}
                />
            </div>
        </main>
    );
}