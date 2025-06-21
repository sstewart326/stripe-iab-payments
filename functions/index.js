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
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://127.0.0.1:5001");
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
  res.send({ 
    status: session.status,
    amount: formatCurrency(session.amount_total, session.currency),
    date: session.created * 1000,
    id: session.payment_intent
  });
});

router.get("/get-products", async (req, res) => {
  const products = await stripe.products.list({
    active: true,
    limit: 100
  });
  const prices = await stripe.prices.list({
    active: true,
    limit: 100
  });
  const productsWithPrices = products.data.map(product => {
    const price = prices.data.find(price => price.product === product.id);
    return {
      name: product.name,
      id: product.id,
      priceId: price.id,
      price: formatCurrency(price.unit_amount, price.currency),
      priceUrl: "/checkout/" + price.id.split("price_")[1]
    }
  });

  res.send({products: productsWithPrices});
});

router.post("/create-product", async (req, res) => {
  const { name, currency, unit_amount } = req.body;
  const product = await stripe.products.create({
    name: name,
    default_price_data: {
      currency: currency,
      unit_amount: unit_amount
    }
  });
  if (product.active) {
    res.send({status: "success"});
  } else {
    res.send({
      status: "error",
      error: "Product not created"
    });
  }
});

router.delete("/delete-product", async (req, res) => {
  const { productId } = req.query;
  const updated = await stripe.products.update(productId, {
    active: false
  });
  if (!updated.active) {
    res.send({ status: "success" });
  } else {
    res.send({ status: "error" })
  }
});

function formatCurrency(amount, currencyCode) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount / 100); // Assuming amount is in cents
}

app.use("/api", router);

// Export the Express app as a Firebase Function
exports.server = functions.https.onRequest(app); 