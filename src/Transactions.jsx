import React, { useEffect, useState } from "react";
import { getApiUrl } from "./UrlUtil";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [prevCursors, setPrevCursors] = useState([]);

  const fetchTransactions = async (cursorParam = null, isNext = true) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${getApiUrl()}/api/charges`;
      if (cursorParam) url += `?cursor=${cursorParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTransactions(data);
      setHasNext(data.length === 10);
      setCursor(cursorParam);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line
  }, []);

  const handleNext = () => {
    if (transactions.length > 0) {
      const lastId = transactions[transactions.length - 1].id;
      setPrevCursors(prev => [...prev, cursor]);
      fetchTransactions(lastId, true);
    }
  };

  const handlePrev = () => {
    if (prevCursors.length > 0) {
      const prevCursor = prevCursors[prevCursors.length - 1];
      setPrevCursors(prev => prev.slice(0, -1));
      fetchTransactions(prevCursor, false);
    }
  };

  // Mobile card rendering
  const renderMobileCards = () => {
    if (loading) {
      return <div className="transactions-loading">Loading...</div>;
    }
    if (error) {
      return <div className="transactions-error">Error: {error}</div>;
    }
    if (transactions.length === 0) {
      return <div className="transactions-loading">No transactions found.</div>;
    }
    return (
      <div className="transactions-mobile-list">
        {transactions.map(tx => (
          <div className="transactions-mobile-card" key={tx.id}>
            <div className="mobile-row"><span className="mobile-label">Date:</span> <span>{new Date(tx.created * 1000).toLocaleString()}</span></div>
            <div className="mobile-row"><span className="mobile-label">Amount:</span> <span>{(tx.amount / 100).toFixed(2)} {tx.currency?.toUpperCase()}</span></div>
            <div className="mobile-row"><span className="mobile-label">Status:</span> <span className={`status-badge status-${tx.status}`}>{tx.status}</span></div>
            <div className="mobile-row"><span className="mobile-label">Email:</span> <span>{tx.email || "-"}</span></div>
            <div className="mobile-row"><span className="mobile-label">Type:</span> <span>{tx.type || "-"}</span></div>
            <div className="mobile-row"><span className="mobile-label">Receipt:</span> {tx.receipt_url ? (
              <a className="receipt-link" href={tx.receipt_url} target="_blank" rel="noopener noreferrer">View</a>
            ) : <span className="receipt-link disabled">-</span>}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="transactions-card">
      <h2 className="transactions-title">Latest Payments</h2>
      {/* Desktop Table */}
      <div className="transactions-table-wrapper fixed-height">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Email</th>
              <th>Type</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="transactions-loading">Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="transactions-error">Error: {error}</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="transactions-loading">No transactions found.</td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{new Date(tx.created * 1000).toLocaleString()}</td>
                  <td>{(tx.amount / 100).toFixed(2)} {tx.currency?.toUpperCase()}</td>
                  <td>
                    <span className={`status-badge status-${tx.status}`}>{tx.status}</span>
                  </td>
                  <td>{tx.email || "-"}</td>
                  <td>{tx.type || "-"}</td>
                  <td>
                    {tx.receipt_url ? (
                      <a className="receipt-link" href={tx.receipt_url} target="_blank" rel="noopener noreferrer">View</a>
                    ) : <span className="receipt-link disabled">-</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile Card List */}
      <div className="transactions-mobile-wrapper">
        {renderMobileCards()}
      </div>
      <div className="transactions-pagination">
        <button className="transactions-btn" onClick={handlePrev} disabled={prevCursors.length === 0}>
          Previous
        </button>
        <button className="transactions-btn" onClick={handleNext} disabled={!hasNext}>
          Next
        </button>
      </div>
    </div>
  );
}

export default Transactions; 