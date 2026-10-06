"use client";

import { useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type RazorpayCheckoutProps = {
  amount: number;
  orderId?: string;
  merchantName?: string;
  description?: string;
};

export default function RazorpayCheckout({
  amount,
  orderId,
  merchantName = "Paytm Clone",
  description = "Payment",
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!amount || amount <= 0) {
        setMessage("Invalid payment amount");
        return;
      }

      // --------------------------------------------------
      // For payment requests we MUST already have
      // a real Razorpay order ID.
      // --------------------------------------------------

      if (!orderId) {
        setMessage(
          "Razorpay order is not available"
        );
        return;
      }

      const scriptLoaded =
        await loadRazorpayScript();

      if (!scriptLoaded) {
        setMessage(
          "Razorpay Checkout failed to load"
        );
        return;
      }

      const options = {
        key:
          process.env
            .NEXT_PUBLIC_RAZORPAY_KEY_ID,

        amount: Math.round(amount * 100),

        currency: "INR",

        name: merchantName,

        description,

        order_id: orderId,

        handler: async function (
          paymentResponse: any
        ) {
          try {
            setMessage(
              "Verifying payment..."
            );

            const verifyResponse =
              await fetch(
                "/api/razorpay/verify",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify({
                    razorpay_order_id:
                      paymentResponse.razorpay_order_id,

                    razorpay_payment_id:
                      paymentResponse.razorpay_payment_id,

                    razorpay_signature:
                      paymentResponse.razorpay_signature,
                  }),
                }
              );

            const verifyData =
              await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              setMessage(
                verifyData.message ||
                  "Payment verification failed"
              );

              return;
            }

            setMessage(
              "Payment successful! ✓"
            );

            console.log(
              "Verified Payment:",
              verifyData
            );
          } catch (error) {
            console.error(
              "Verification Error:",
              error
            );

            setMessage(
              "Payment verification failed"
            );
          }
        },

        theme: {
          color: "#3399cc",
        },

        modal: {
          ondismiss: function () {
            setMessage(
              "Payment window closed"
            );
          },
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        function (response: any) {
          console.error(
            "Payment failed:",
            response.error
          );

          setMessage(
            response.error?.description ||
              "Payment failed"
          );
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(
        "Checkout Error:",
        error
      );

      setMessage(
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className="rounded-md bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Opening Checkout..."
          : `Pay ₹${amount.toLocaleString(
              "en-IN"
            )}`}
      </button>

      {message && (
        <p className="text-sm text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
}