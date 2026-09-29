import RazorpayCheckout from "../../components/RazorpayCheckout";

export default function RazorpayTestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-3 text-2xl font-bold text-gray-800">
          Razorpay Test Payment
        </h1>

        <p className="mb-6 text-gray-600">
          Test payment amount: ₹10
        </p>

        <RazorpayCheckout amount={10} />
      </div>
    </main>
  );
}