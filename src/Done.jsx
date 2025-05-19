import React, { useState, useEffect } from "react";
import { useSearchParams, Link, Navigate } from "react-router-dom";
import { getApiUrl } from "./UrlUtil"


export default function Page() {
  // Get the checkout session ID from the URL
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState(null);

   useEffect(() => {
    const baseUrl = getApiUrl()
    // Retrieve the checkout session status as soon as the page loads
    if (sessionId) {
      fetch(`${baseUrl}/api/session-status?session_id=${sessionId}`)
        .then((res) => res.json())
        // Set the checkout session status in state
        .then((data) => setStatus(data.status));
    }
  }, [sessionId]);

  // Show loading indicator until we get checkout session status
  if (!status) {
    return <div className="spinner" />;
  }

  // Redirect if payment failed or was canceled
  if (status === "open") {
    return <Navigate to="/" />
  }

  return (
    <div className="container">
      <p className="message">Your purchase was successful</p>

      <Link to="/" className="button">
        Back to products
      </Link>
    </div>
  );
}