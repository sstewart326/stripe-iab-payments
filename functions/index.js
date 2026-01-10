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

console.log(`NODE_ENV = ${process.env.NODE_ENV}`)
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
  console.log("Starting /create-checkout-session...");
  const { priceId, isSubscription, anchorTimestamp } = req.body;
  console.log(`priceId: ${priceId}, isSubscription: ${isSubscription}, anchorTimestamp: ${anchorTimestamp}`);
  const mode = isSubscription ? "subscription" : "payment";

  const subscriptionConfig = anchorTimestamp ? {
    billing_cycle_anchor: anchorTimestamp,
    proration_behavior: "none"
  } : undefined;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: mode,
    subscription_data: subscriptionConfig,
    ui_mode: "embedded",
    return_url: `${getDomain()}/done?session_id={CHECKOUT_SESSION_ID}&isSubscription=${isSubscription}&anchorTimestamp=${anchorTimestamp}`,
  });

  res.send({ clientSecret: session.client_secret });
});

// Get status of checkout session
router.get("/session-status", async (req, res) => {
  console.log("Starting /session-status...");
  const { session_id } = req.query;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  
  const responseData = {
    status: session.status,
    amount: formatCurrency(session.amount_total, session.currency),
    date: session.created * 1000,
    id: session.payment_intent || session.subscription
  };

  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
    
    responseData.isSubscription = true;
    responseData.subscriptionAmount = formatCurrency(price.unit_amount, price.currency);
    responseData.nextBillingDate = subscription.current_period_end * 1000;
    responseData.subscriptionId = subscription.id;
    if (subscription.billing_cycle_anchor) {
      responseData.anchorTimestamp = subscription.billing_cycle_anchor;
    }
  }

  res.send(responseData);
});

router.get("/get-products", async (req, res) => {
  console.log("Starting /get-products...");
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

    const params = new URLSearchParams();
    if (price.recurring) {
      params.append('interval', price.recurring.interval);
      params.append('interval_count', price.recurring.interval_count);
    }
    if (product.metadata && product.metadata.anchorTimestamp) {
      params.append('anchorTimestamp', product.metadata.anchorTimestamp);
    }
    const priceUrl = `/checkout/${price.id.split("price_")[1]}?${params.toString()}`;
    return {
      name: product.name,
      id: product.id,
      priceId: price.id,
      price: formatCurrency(price.unit_amount, price.currency),
      recurring: price.recurring,
      priceUrl: priceUrl
    }
  });

  res.send({products: productsWithPrices});
});

router.get("/charges", async (req, rsp) => {
  console.log("Starting /charges...");
  const { cursor } = req.query;
  const params = { limit: 10 };
  if (cursor) {
    params.starting_after = cursor;
  }
  const charges = await stripe.charges.list(params);
  const rspJson = charges.data.map(charge => ({
    amount: charge.amount,
    currency: charge.currency,
    created: charge.created,
    id: charge.id,
    status: charge.refunded ? "refunded" : charge.status,
    description: charge.description,
    receipt_url: charge.receipt_url,
    email: charge.billing_details.email,
    type: charge.payment_method_details.type,
    paid: charge.paid
  }));
  rsp.send(rspJson);
});

router.post("/create-product", async (req, res) => {
  console.log("Starting /create-product...");
  const { name, currency, unit_amount, recurring, metadata } = req.body;
  const defaultPriceConfig = {
    currency: currency,
    unit_amount: unit_amount
  }
  if (recurring) {
    defaultPriceConfig.recurring = {
      interval: recurring.interval,
      interval_count: recurring.interval_count
    }
  }
  const productConfig = {
    name: name,
    default_price_data: defaultPriceConfig
  }
  if (metadata) {
    productConfig.metadata = metadata;
  }
  const product = await stripe.products.create(productConfig);
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
  console.log("Starting /delete-product...");
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