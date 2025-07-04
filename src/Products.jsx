import React, { useState, useEffect } from "react";
import "./App.css";
import { getApiUrl } from "./UrlUtil";

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
    unit_amount: ""
  });

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
      const response = await fetch(`${baseUrl}/api/create-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          currency: formData.currency,
          unit_amount: parseInt(formData.unit_amount) * 100 // Convert to cents
        }),
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
          unit_amount: ""
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
        <div className="products-table-layout">
          {/* Left: Create Product Section */}
          <div className="create-section-td">
            <h2>Create New Product</h2>
            <div className="create-product-section">
              <form className="create-product-form" onSubmit={createProduct}>
                <div className="form-group">
                  <label htmlFor="name">Product Name *</label>
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
                  <label htmlFor="unit_amount">Price *</label>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products; 