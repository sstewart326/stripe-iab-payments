import React, { useState, useEffect } from "react";
import { useSearchParams, Link, Navigate } from "react-router-dom";
import { getApiUrl } from "./UrlUtil"
import { CheckCircle, Download, Mail, ArrowRight } from 'lucide-react';


export default function Page() {
  // Get the checkout session ID from the URL
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [data, setData] = useState(null);

  useEffect(() => {
    const baseUrl = getApiUrl()
    // Retrieve the checkout session status as soon as the page loads
    if (sessionId) {
      fetch(`${baseUrl}/api/session-status?session_id=${sessionId}`)
        .then((res) => res.json())
        // Set the checkout session status in state
        .then((data) => setData(data));
    }
  }, [sessionId]);

  // Show loading indicator until we get checkout session status
  if (!data) {
    return <div className="spinner" />;
  }

  // Redirect if payment failed or was canceled
  if (data.status === "open") {
    return <Navigate to="/" />
  }

  return (
    <div className="App">
      <div className="confirm-card">
        <div className="celebration-image">
          <img className="celebration-image-img" src="/IAB.png" alt="IAB Logo" />
        </div>
        <svg className="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" fill="none" />
          <path d="M9 12l2 2l4-4" stroke="#22c55e" strokeWidth="2" fill="none" />
        </svg>
        <h1 className="payment-confirmed-title" >Payment Confirmed!</h1>
        <p className="payment-confirmed-message">Your payment has been successfully processed</p>
        <div className="transaction-details">
          <div className="transaction-details-row">
            <span className="transaction-id">Transaction ID</span>
            <span className="transaction-value">{data.id}</span>
          </div>
          <div className="transaction-details-row">
            <span className="transaction-amount">Amount</span>
            <span className="transaction-value">{data.amount}</span>
          </div>
          <div className="transaction-details-row">
            <span className="transaction-date">Date</span>
            <span className="transaction-value">{new Date(data.date).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="confirm-message">
          <p>A confirmation email has been sent to your inbox.</p>
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    </div>
  );
}