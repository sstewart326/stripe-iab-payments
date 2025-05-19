const functions = require('firebase-functions');
const express = require('express');
require('dotenv').config();

// Initialize stripe with the appropriate secret key
const stripe = require('stripe')(
  process.env.NODE_ENV === 'development' 
    ? process.env.STRIPE_SECRET 
    : functions.config().stripe.secret
);

const app = express();
const router = express.Router();
const cors = require('cors')

var allowedOrigins = [
  "https://iab-payments.firebaseapp.com",
  "https://pay.inglesabordo.com"
];

if (process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://localhost:3000")
}

const corsHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
  }
});

app.use(corsHandler)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get domain from appropriate source
const getDomain = () => {
  if (process.env.NODE_ENV === 'development') {
    return process.env.IAB_DOMAIN;
  }
  return functions.config().iab.domain;
};

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  const { priceId } = req.body;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "payment",
    ui_mode: "embedded",
    return_url: `${getDomain()}/done?session_id={CHECKOUT_SESSION_ID}`,
  });

  res.send({ clientSecret: session.client_secret });
});

// Get status of checkout session
router.get("/session-status", async (req, res) => {
  const { session_id } = req.query;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  res.send({ status: session.status });
});

app.use("/api", router);

// Export the Express app as a Firebase Function
exports.server = functions.https.onRequest(app); 