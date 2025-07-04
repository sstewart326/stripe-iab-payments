import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './firebase'; // Ensure Firebase is initialized before the app renders

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(<App />);