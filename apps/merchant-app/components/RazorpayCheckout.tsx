
"use client";

import { useState } from "react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type RazorpayCheckoutProps = {
  amount: number;
};

export default function RazorpayCheckout({
  amount,
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

      // Validate amount
      if (!amount || amount <= 0) {
        setMessage("Please enter a valid amount");
        return;
      }

      // Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        setMessage("Razorpay Checkout failed to load");
        return;
      }

      // Create Razorpay order
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Order creation failed");
        return;
      }

      // Razorpay checkout options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,

        amount: data.order.amount,

        currency: data.order.currency,

        name: "Paytm Clone",

        description: "Test Payment",

        order_id: data.order.id,

        // Handle successful payment
        handler: async function (paymentResponse: any) {
          try {
            setMessage("Verifying payment...");

            // Send payment details to backend
            const verifyResponse = await fetch(
              "/api/razorpay/verify",
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
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

            const verifyData = await verifyResponse.json();

            // Check verification response
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

            // Payment successfully verified
            setMessage(
              "Payment verified successfully! ✅"
            );

            console.log(
              "Verified Payment Details:",
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

        // Razorpay theme
        theme: {
          color: "#3399cc",
        },

        // When payment window is closed
        modal: {
          ondismiss: function () {
            setMessage("Payment window closed");
          },
        },
      };

      // Create Razorpay instance
      const razorpay = new window.Razorpay(options);

      // Handle payment failure
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

      // Open Razorpay checkout
      razorpay.open();
    } catch (error) {
      console.error("Checkout Error:", error);

      setMessage("Something went wrong");
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
          : `Pay ₹${amount}`}
      </button>

      {message && (
        <p className="text-sm text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
}