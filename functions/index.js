const path = require('path');
const logger = require('firebase-functions/logger');

const functions = require('firebase-functions');
const express = require('express');

require('dotenv').config({ path: path.join(__dirname, '.env') });
if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR === 'true') {
  require('dotenv').config({ path: path.join(__dirname, '../.env.development'), override: true });
}

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
const isLocalEnv = process.env.NODE_ENV === "development" || process.env.FUNCTIONS_EMULATOR === "true";
if (isLocalEnv) {
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://127.0.0.1:5003");
}

const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
  }
});

// Get domain from appropriate source
const getDomain = () => {
  if (process.env.NODE_ENV === 'development') {
    return process.env.IAB_DOMAIN;
  }
  return functions.config().iab.domain;
};

const getConfigValue = (envKey, configPath) => {
  if (process.env.NODE_ENV === 'development' || process.env.FUNCTIONS_EMULATOR === 'true') {
    return process.env[envKey];
  }
  const parts = configPath.split('.');
  let value = functions.config();
  for (const part of parts) {
    value = value?.[part];
  }
  return value;
};

const getRegisterUrl = () => getConfigValue('MAIN_APP_REGISTER_URL', 'iab.register_url');
const getRegisterSecret = () => getConfigValue('REGISTER_PAYMENT_SECRET', 'iab.register_secret');
const getWebhookSecret = () => getConfigValue('STRIPE_WEBHOOK_SECRET', 'stripe.webhook_secret');

function buildIabMetadata({ userEmail, classId, dueDate }) {
  const metadata = {};
  if (userEmail) metadata.userEmail = userEmail;
  if (classId) metadata.classId = classId;
  if (dueDate) metadata.dueDate = dueDate;
  return metadata;
}

function hasIabMetadata(metadata) {
  return metadata && metadata.userEmail && metadata.classId;
}

async function registerPaymentInMainApp(payload) {
  const registerUrl = getRegisterUrl();
  const registerSecret = getRegisterSecret();

  if (!registerUrl || !registerSecret) {
    logger.warn('Payment registration not configured (MAIN_APP_REGISTER_URL / REGISTER_PAYMENT_SECRET)');
    return null;
  }

  logger.info('Submitting payment to main app: ' + registerUrl)
  const response = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${registerSecret}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Registration failed with status ${response.status}`);
  }

  logger.info('Registered payment in main app', { paymentId: body.paymentId, created: body.created });
  return body;
}

async function registerFromSession(session) {

  if (session.status !== 'complete' || !hasIabMetadata(session.metadata)) {
    logger.info("skipping registering payment as the status was not complete", {sessionId: session.id, sessionStatus: session.status})
    return null;
  }

  const amount = session.amount_total != null ? session.amount_total / 100 : undefined;
  return registerPaymentInMainApp({
    userEmail: session.metadata.userEmail,
    classId: session.metadata.classId,
    dueDate: session.metadata.dueDate,
    amount,
    currency: session.currency,
    stripeReference: session.id,
  });
}

async function registerFromInvoice(invoice) {
  if (!invoice.subscription) {
    return null;
  }

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const metadata = subscription.metadata || {};

  if (!hasIabMetadata(metadata)) {
    return null;
  }

  const line = invoice.lines?.data?.[0];
  const period = line?.period;
  const amount = invoice.amount_paid != null ? invoice.amount_paid / 100 : undefined;

  const payload = {
    userEmail: metadata.userEmail,
    classId: metadata.classId,
    amount,
    currency: invoice.currency,
    stripeReference: invoice.id,
  };

  if (invoice.billing_reason === 'subscription_cycle' && period) {
    payload.billingPeriodStart = period.start;
    payload.billingPeriodEnd = period.end;
  } else if (metadata.dueDate) {
    payload.dueDate = metadata.dueDate;
  } else if (period) {
    payload.billingPeriodStart = period.start;
    payload.billingPeriodEnd = period.end;
  } else {
    logger.warn('Could not determine due date for invoice', invoice.id);
    return null;
  }

  return registerPaymentInMainApp(payload);
}

// Stripe webhook — use req.rawBody (Firebase preserves the wire-format body before Express runs)
app.post('/api/stripe-webhook', async (req, res) => {
    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      res.status(500).send('Webhook not configured');
      return;
    }

    const signature = req.headers['stripe-signature'];
    const rawBody = req.rawBody;
    if (!rawBody) {
      logger.error('Missing req.rawBody for webhook verification');
      res.status(500).send('Webhook configuration error');
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      logger.info("received payment event", event)
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await registerFromSession(session);
          break;
        }
        case 'invoice.paid': {
          const invoice = event.data.object;
          await registerFromInvoice(invoice);
          break;
        }
        default:
          logger.warn("checkout type unrecognized", {eventType: event.type})
          break;
      }
      res.json({ received: true });
    } catch (err) {
      logger.error('Webhook handler error:', err);
      res.status(500).json({ error: err.message });
    }
});

app.use(corsHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  logger.info("Starting /create-checkout-session...");
  const { priceId, isSubscription, anchorTimestamp, userEmail, classId, dueDate } = req.body;
  logger.info(`priceId: ${priceId}, isSubscription: ${isSubscription}, anchorTimestamp: ${anchorTimestamp}`);
  const mode = isSubscription ? "subscription" : "payment";

  const iabMetadata = buildIabMetadata({ userEmail, classId, dueDate });

  const subscriptionConfig = anchorTimestamp ? {
    billing_cycle_anchor: anchorTimestamp,
    proration_behavior: "none",
    ...(Object.keys(iabMetadata).length > 0 ? { metadata: iabMetadata } : {}),
  } : (Object.keys(iabMetadata).length > 0 ? { metadata: iabMetadata } : undefined);

  const sessionConfig = {
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: mode,
    ui_mode: "embedded",
    return_url: `${getDomain()}/done?session_id={CHECKOUT_SESSION_ID}&isSubscription=${isSubscription}&anchorTimestamp=${anchorTimestamp}`,
  };

  if (Object.keys(iabMetadata).length > 0) {
    sessionConfig.metadata = iabMetadata;
  }

  if (mode === 'subscription') {
    sessionConfig.subscription_data = subscriptionConfig;
  } else if (Object.keys(iabMetadata).length > 0) {
    sessionConfig.payment_intent_data = { metadata: iabMetadata };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  res.send({ clientSecret: session.client_secret });
});

// Get status of checkout session
router.get("/session-status", async (req, res) => {
  logger.info("Starting /session-status...");
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

  if (session.status === 'complete' && hasIabMetadata(session.metadata)) {
    try {
      await registerFromSession(session);
    } catch (err) {
      logger.error('Failed to register payment from session-status:', err);
    }
  }

  res.send(responseData);
});

router.get("/get-products", async (req, res) => {
  logger.info("Starting /get-products...");
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
  logger.info("Starting /charges...");
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
  logger.info("Starting /create-product...");
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
  logger.info("Starting /delete-product...");
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
  }).format(amount / 100);
}

app.use("/api", router);

exports.server = functions.https.onRequest(app);
