import React, { useState, useEffect } from "react";
import "./App.css";
import { getApiUrl } from "./UrlUtil"

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const baseUrl = getApiUrl()
      const response = await fetch(`${baseUrl}/api/get-products`);
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (url) => {
    try {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(url);
      setTimeout(() => {
        setCopiedUrl(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      alert("Failed to copy URL");
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="container">
          <div className="logo">Loading products...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="container">
          <div className="logo">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <div className="page-title">Products</div>
        {products.map((product, index) => (
          <div
            key={index}
            className="product"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="product-info">
              <div className="product-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 21.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div className="product-details">
                <h3>{product.name}</h3>
                <p className="price">{product.price}</p>
              </div>
            </div>
            <button
              className="button"
              onClick={() => copyToClipboard(product.priceUrl)}
              disabled={copiedUrl === product.priceUrl}
            >
              {copiedUrl === product.priceUrl ? "Copied!" : "Copy URL"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products; 