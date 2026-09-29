"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { TextInput } from "@repo/ui/textinput";
import { createOnRampTransaction } from "../app/lib/actions/createOnrampTransaction";

export type BankOption = {
    name: string;
    redirectUrl: string;
};

export const AddMoney = ({ banks }: { banks: BankOption[] }) => {
    const [redirectUrl, setRedirectUrl] = useState(
        banks[0]?.redirectUrl ?? ""
    );

    const [provider, setProvider] = useState(
        banks[0]?.name ?? ""
    );

    const [value, setValue] = useState(0);

    if (!banks.length) {
        return (
            <Card title="Add Money">
                <div className="text-center py-8 text-slate-500">
                    No banks configured. Run database seed.
                </div>
            </Card>
        );
    }

    return (
        <Card title="Add Money">
            <div className="w-full">
                <TextInput
                    label={"Amount"}
                    placeholder={"Amount"}
                    onChange={(val) => {
                        setValue(Number(val));
                    }}
                />

                <div className="py-4 text-left">
                    Bank
                </div>

                <Select
                    onSelect={(selectedBank) => {
                        const bank = banks.find(
                            (x) => x.name === selectedBank
                        );

                        setRedirectUrl(bank?.redirectUrl || "");
                        setProvider(bank?.name || "");
                    }}
                    options={banks.map((x) => ({
                        key: x.name,
                        value: x.name,
                    }))}
                />

                <div className="flex justify-center pt-4">
                    <Button
                        onClick={async () => {
                            try {
                                if (!provider) {
                                    alert("Please select a bank");
                                    return;
                                }

                                if (!value || value <= 0) {
                                    alert("Please enter a valid amount");
                                    return;
                                }

                                const result =
                                    await createOnRampTransaction(
                                        provider,
                                        value
                                    );

                                if (result.message !== "Done") {
                                    alert(result.message);
                                    return;
                                }

                                if (!redirectUrl) {
                                    alert(
                                        "Redirect URL is not available for this bank"
                                    );
                                    return;
                                }

                                window.location.href = redirectUrl;
                            } catch (error) {
                                console.error(
                                    "Add Money Error:",
                                    error
                                );

                                alert(
                                    "Something went wrong while adding money"
                                );
                            }
                        }}
                    >
                        Add Money
                    </Button>
                </div>
            </div>
        </Card>
    );
};