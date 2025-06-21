import React, { useCallback } from "react";
import { useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getApiUrl } from "./UrlUtil"

// Load Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Page() {
  // Get the priceId from the URL
  const { priceId } = useParams();

  // Function that creates a Checkout Session
  // This is called automatically by the Checkout Provider
  const fetchClientSecret = useCallback(() => {
    const baseUrl = getApiUrl()
    
    return (
      fetch(`${baseUrl}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass priceId to our server
        body: JSON.stringify({ priceId: `price_${priceId}` }),
      })
        .then((res) => res.json())
        // Return the checkout session client secret
        .then((data) => data.clientSecret)
    );
  }, [priceId]);

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret }}
    >
      <EmbeddedCheckout className="checkout" />
    </EmbeddedCheckoutProvider>
  );
}

