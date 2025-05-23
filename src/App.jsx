import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Checkout from "./Checkout";
import Done from "./Done";
import "./App.css";

const App = () => {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/checkout/:priceId" element={<Checkout />} />
          <Route path="/done" element={<Done />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;

