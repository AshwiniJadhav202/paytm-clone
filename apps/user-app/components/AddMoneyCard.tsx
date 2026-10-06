"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Select } from "@repo/ui/select";
import { TextInput } from "@repo/ui/textinput";
import { useState } from "react";

export type BankOption = {
    id: number;
    bankName: string;
    maskedAccount: string;
    provider: string;
};

export const AddMoney = ({ banks }: { banks: BankOption[] }) => {
    const [bankAccountId, setBankAccountId] = useState(
        banks[0]?.id ?? 0
    );

    const [amount, setAmount] = useState(0);
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);

    if (!banks.length) {
        return (
            <Card title="Add Money">
                <div className="text-center py-8 text-slate-500">
                    No bank account linked.
                    <br />
                    Please link a bank account first.
                </div>
            </Card>
        );
    }

    const selectedBank = banks.find(
        (bank) => bank.id === bankAccountId
    );

    async function handleAddMoney() {
        try {
            if (!bankAccountId) {
                alert("Please select a bank account");
                return;
            }

            if (!Number.isInteger(amount) || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }

            if (amount > 100000) {
                alert("Maximum amount is ₹100000");
                return;
            }

            if (!/^\d{6}$/.test(pin)) {
                alert("Please enter a valid 6-digit Payment PIN");
                return;
            }

            setLoading(true);

            const response = await fetch(
                "/api/demo-bank/add-money",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        bankAccountId,
                        amount,
                        pin,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Unable to add money");
                return;
            }

            alert(
                `₹${result.amount} added successfully!\n\nNew Wallet Balance: ₹${result.balance}`
            );

            setAmount(0);
            setPin("");

            /*
             * Refresh the current page so that the BalanceCard
             * displays the updated wallet balance and the
             * transaction list displays the new transaction.
             */
            window.location.reload();
        } catch (error) {
            console.error("Add Money Error:", error);

            alert(
                "Something went wrong while adding money"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card title="Add Money">
            <div className="w-full">

                {/* Amount */}
                <TextInput
                    label="Amount"
                    placeholder="Enter amount"
                    onChange={(value) => {
                        setAmount(Number(value));
                    }}
                />

                {/* Bank Account */}
                <div className="py-4 text-left font-medium">
                    Bank Account
                </div>

                <Select
                    onSelect={(selectedBank) => {
                        const bank = banks.find(
                            (x) =>
                                `${x.bankName} - ${x.maskedAccount}` ===
                                selectedBank
                        );

                        if (bank) {
                            setBankAccountId(bank.id);
                        }
                    }}
                    options={banks.map((bank) => ({
                        key: `${bank.bankName} - ${bank.maskedAccount}`,
                        value: `${bank.bankName} - ${bank.maskedAccount}`,
                    }))}
                />

                {/* Selected bank details */}
                {selectedBank && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="font-semibold">
                            {selectedBank.bankName}
                        </div>

                        <div className="text-slate-500">
                            Account: {selectedBank.maskedAccount}
                        </div>
                    </div>
                )}

                {/* Payment PIN */}
                <div className="pt-4">
                    <TextInput
                        label="Payment PIN"
                        placeholder="Enter 6-digit PIN"
                        onChange={(value) => {
                            setPin(value.replace(/\D/g, "").slice(0, 6));
                        }}
                    />
                </div>

                {/* Add Money button */}
                <div className="flex justify-center pt-6">
                    <Button
                        onClick={handleAddMoney}
                    >
                        {loading ? "Processing..." : "Add Money"}
                    </Button>
                </div>
            </div>
        </Card>
    );
};
