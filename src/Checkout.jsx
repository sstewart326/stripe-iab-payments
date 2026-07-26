import React, { useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getApiUrl } from "./UrlUtil"

// Load Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Page() {
  // Get the priceId from the URL
  const { priceId } = useParams();
  const [searchParams] = useSearchParams();

  // Function that creates a Checkout Session
  // This is called automatically by the Checkout Provider
  const fetchClientSecret = useCallback(() => {
    const url = `${getApiUrl()}/api/create-checkout-session`
    const anchorTimestamp = searchParams.get("anchorTimestamp");
    const userEmail = searchParams.get("userEmail");
    const classId = searchParams.get("classId");
    const dueDate = searchParams.get("dueDate");
    return (
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          priceId: priceId.startsWith("price_") ? priceId : `price_${priceId}`,
          isSubscription: !!searchParams.get("interval"),
          anchorTimestamp: anchorTimestamp ? parseInt(anchorTimestamp) : undefined,
          userEmail: userEmail || undefined,
          classId: classId || undefined,
          dueDate: dueDate || undefined,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to create checkout session");
          }
          // Return the checkout session client secret
          return data.clientSecret;
        })
        .catch((error) => {
          console.error("Error creating checkout session:", error);
          alert(error.message || "Failed to create checkout session. Please check that the first payment date is in the future.");
          throw error;
        })
    );
  }, [priceId, searchParams]);

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret }}
    >
      <EmbeddedCheckout className="checkout" />
    </EmbeddedCheckoutProvider>
  );
}

