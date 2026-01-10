import React, { useState, useEffect } from "react";
import "./App.css";
import { getApiUrl } from "./UrlUtil";
import Transactions from "./Transactions";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    currency: "usd",
    unit_amount: "",
    is_subscription: false,
    subscription_interval: "",
    interval_count: "",
    subscription_first_payment_date: ""
  });
  const [currentPage, setCurrentPage] = useState(0);
  const PRODUCTS_PER_PAGE = 2;

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

  const deleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setDeletingProduct(productId);
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/delete-product?productId=${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      const result = await response.json();
      if (result.status === "success") {
        // Remove the product from the local state
        setProducts(products.filter(product => product.id !== productId));
      } else {
        throw new Error("Failed to delete product");
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product");
    } finally {
      setDeletingProduct(null);
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.unit_amount) {
      alert("Please fill in all required fields");
      return;
    }

    setCreatingProduct(true);
    try {
      const baseUrl = getApiUrl();
      const requestBody = {
        name: formData.name,
        currency: formData.currency,
        unit_amount: parseInt(formData.unit_amount) * 100, // Convert to cents
      }
      if (formData.is_subscription) {
        requestBody.recurring = {
          interval: formData.subscription_interval,
          interval_count: parseInt(formData.interval_count),
        };
        if (formData.subscription_first_payment_date) {
          // Create date at midnight in local timezone, then convert to UTC
          const dateParts = formData.subscription_first_payment_date.split('-');
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
          const day = parseInt(dateParts[2]);
          const anchorDate = new Date(year, month, day, 0, 0, 0, 0); // Local timezone midnight
          const anchorTimestamp = Math.floor(anchorDate.getTime() / 1000); // Convert to UTC timestamp
          
          // Validate that the date is in the future
          const now = Math.floor(Date.now() / 1000);
          if (anchorTimestamp <= now) {
            alert("First payment date must be in the future");
            setCreatingProduct(false);
            return;
          }
          
          requestBody.metadata = {
            anchorTimestamp: String(anchorTimestamp)
          };
        }
      }
      const response = await fetch(`${baseUrl}/api/create-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to create product");
      }

      const result = await response.json();
      if (result.status === "success") {
        // Reset form and refresh products
        setFormData({
          name: "",
          currency: "usd",
          unit_amount: "",
          is_subscription: false,
          subscription_interval: "",
          interval_count: "",
          subscription_first_payment_date: ""
        });
        await fetchProducts(); // Refresh the products list
        alert("Product created successfully!");
      } else {
        throw new Error(result.error || "Failed to create product");
      }
    } catch (err) {
      console.error("Failed to create product:", err);
      alert("Failed to create product: " + err.message);
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const startIdx = currentPage * PRODUCTS_PER_PAGE;
  const endIdx = startIdx + PRODUCTS_PER_PAGE;
  const paginatedProducts = products.slice(startIdx, endIdx);
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);

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
        <div className="products-table-layout">
          {/* Left: Create Product Section */}
          <div className="create-section-td">
            <h2>Create New Product</h2>
            <div className="create-product-section">
              <form className="create-product-form" onSubmit={createProduct}>
                <div className="form-group">
                  <label htmlFor="name">Product Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    <option value="usd">USD ($)</option>
                    <option value="brl">BRL (R$)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="unit_amount">Price</label>
                  <input
                    type="number"
                    id="unit_amount"
                    name="unit_amount"
                    value={formData.unit_amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label htmlFor="isSubscription" className="checkbox-label">
                    <span className="checkbox-text">Subscription</span>
                    <input
                      type="checkbox"
                      id="isSubscription"
                      name="is_subscription"
                      checked={formData.is_subscription}
                      onChange={handleInputChange}
                      className="custom-checkbox"
                    />
                  </label>
                </div>
                {formData.is_subscription && (<div className="form-group">
                  <label htmlFor="subscriptionInterval">Subscription Interval</label>
                  <select
                    id="subscriptionInterval"
                    name="subscription_interval"
                    value={formData.subscription_interval}
                    onChange={handleInputChange}
                  >
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>)}
                {formData.is_subscription && (<div className="form-group">
                  <label htmlFor="subscriptionIntervalCount">Subscription ends after this many charges</label>
                  <input
                    type="number"
                    id="interval_count"
                    name="interval_count"
                    value={formData.interval_count}
                    onChange={handleInputChange}
                    placeholder="1"
                    step="1"
                    min="1"
                    required
                  />
                </div>)}
                {formData.is_subscription && (<div className="form-group">
                  <label htmlFor="subscriptionFirstPaymentDate">First Payment Date</label>
                  <input
                    type="date"
                    id="subscriptionFirstPaymentDate"
                    name="subscription_first_payment_date"
                    value={formData.subscription_first_payment_date}
                    onChange={handleInputChange}
                  />
                </div>)}
                <button
                  type="submit"
                  className="button create-button"
                  disabled={creatingProduct}
                >
                  {creatingProduct ? "Creating..." : "Create Product"}
                </button>
              </form>
            </div>

          </div>
          {/* Right: Products List Section */}
          <div className="products-section-td">
            <h2>Existing Products</h2>
            {paginatedProducts.map((product, index) => (
              <div
                key={product.id || index}
                className="product"
                style={{ animationDelay: `${(startIdx + index) * 150}ms` }}
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
                    <h2>{product.name}</h2>
                    {product.recurring === null ? (
                      <h3>One-Time Payment</h3>
                    ) : (
                      <h3>
                        {product.recurring.interval_count === 1
                          ? `Billed every ${product.recurring.interval}`
                          : `Billed every ${product.recurring.interval} for ${product.recurring.interval_count} ${product.recurring.interval}s`
                        }
                      </h3>
                    )
                }
                    <p className="price">{product.price}</p>
                  </div>
                </div>
                <div className="product-actions">
                  <button
                    className="button"
                    onClick={() => copyToClipboard(product.priceUrl)}
                    disabled={copiedUrl === product.priceUrl}
                  >
                    {copiedUrl === product.priceUrl ? "Copied!" : "Copy URL"}
                  </button>
                  <button
                    className="button delete-button"
                    onClick={() => deleteProduct(product.id)}
                    disabled={deletingProduct === product.id}
                  >
                    {deletingProduct === product.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
            {/* Pagination Controls */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
              <button
                className="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                style={{ minWidth: 100 }}
              >
                Previous
              </button>
              <button
                className="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1 || totalPages === 0}
                style={{ minWidth: 100 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
        <hr style={{ margin: '40px 0' }} />
        <Transactions />
      </div>
    </div>
  );
};

export default Products; 