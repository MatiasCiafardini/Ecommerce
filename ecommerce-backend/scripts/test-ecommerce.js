const axios = require('axios');

const API = process.env.BACKEND_API_URL || 'http://localhost:3000/api';
const STORE_ID = Number(process.env.TEST_STORE_ID || 1);
const ADMIN_EMAIL =
  process.env.TEST_ADMIN_EMAIL ||
  (STORE_ID === 2 ? 'admin-store2@demo.com' : 'admin@demo.com');

let token;
let customerToken;
let customerEmail;
let customerPassword;

let productId;
let categoryId;
let variantId;
let customerId;
let addressId;
let cartId;
let orderId;
let shipmentId;
let returnId;
let webhookId;
const ADMIN_PASSWORD_CANDIDATES = process.env.TEST_ADMIN_PASSWORD
  ? [process.env.TEST_ADMIN_PASSWORD]
  : ['admin123', '123456'];

const api = axios.create({
  baseURL: API,
  headers: {
    'x-store-id': STORE_ID,
  },
});

const customerApi = axios.create({
  baseURL: API,
  headers: {
    'x-store-id': STORE_ID,
  },
});

function logStep(name) {
  console.log('\n==============================');
  console.log('STEP:', name);
  console.log('==============================\n');
}

async function login() {
  logStep('LOGIN');

  let res;
  let lastError;

  for (const password of ADMIN_PASSWORD_CANDIDATES) {
    try {
      res = await api.post('/auth/session-login', {
        email: ADMIN_EMAIL,
        password,
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!res) {
    throw lastError;
  }

  token = res.data.access_token;

  api.defaults.headers.Authorization = `Bearer ${token}`;

  console.log('TOKEN OK');
}

async function createCategory() {
  logStep('CREATE CATEGORY');

  const res = await api.post('/categories', {
    name: 'Electronics-' + Date.now(),
  });

  categoryId = res.data.id;

  console.log('CATEGORY:', categoryId);
}

async function createProduct() {
  logStep('CREATE PRODUCT');

  const res = await api.post('/products', {
    title: 'Debug Product ' + Date.now(),
    description: 'Full ecommerce test product',
  });

  productId = res.data.id;

  console.log('PRODUCT:', productId);
}

async function linkProductCategory() {
  logStep('LINK PRODUCT CATEGORY');

  await api.post(`/products/${productId}/categories/${categoryId}`);

  console.log('PRODUCT CATEGORY LINKED');
}

async function createVariant() {
  logStep('CREATE VARIANT');

  const res = await api.post('/variants', {
    productId,
    sku: 'DEBUG-' + Date.now(),
    price: 100,
  });

  variantId = res.data.id;

  console.log('VARIANT:', variantId);
}

async function createInventory() {
  logStep('CREATE INVENTORY');

  await api.post('/inventory', {
    variantId,
    quantity: 100,
  });

  console.log('INVENTORY CREATED');
}

async function createCustomer() {
  logStep('REGISTER CUSTOMER');

  customerEmail = `debug${Date.now()}@mail.com`;
  customerPassword = 'debug123';

  const res = await api.post('/auth/customer/register', {
    email: customerEmail,
    password: customerPassword,
    firstName: 'Debug',
    lastName: 'User',
    phone: '+5491100000000',
  });

  customerId = res.data.id;

  console.log('CUSTOMER:', customerId);
}

async function loginCustomer() {
  logStep('LOGIN CUSTOMER');

  const res = await customerApi.post('/auth/customer/login', {
    email: customerEmail,
    password: customerPassword,
  });

  customerToken = res.data.access_token;
  customerApi.defaults.headers.Authorization = `Bearer ${customerToken}`;

  console.log('CUSTOMER TOKEN OK');
}

async function createAddress() {
  logStep('CREATE CUSTOMER ADDRESS');

  const res = await customerApi.post('/customer-addresses/me', {
    firstName: 'Debug',
    lastName: 'User',
    phone: '+5491100000000',
    address1: 'Fake Street 123',
    city: 'Buenos Aires',
    state: 'CABA',
    zip: '1000',
    country: 'AR',
  });

  addressId = res.data.id;

  console.log('ADDRESS:', addressId);
}

async function createCart() {
  logStep('CREATE CART');

  const res = await customerApi.post('/store/cart', {
  });

  cartId = res.data.id;

  console.log('CART:', cartId);
}

async function addCartItem() {
  logStep('ADD CART ITEM');

  await customerApi.post(`/store/cart/${cartId}/items`, {
    variantId,
    quantity: 2,
  });

  console.log('ITEM ADDED');
}

async function checkout() {
  logStep('CHECKOUT');

  const res = await customerApi.post(`/store/checkout/${cartId}`, {
    shippingMethod: 'standard',
    shippingCost: 0,
    idempotencyKey: `checkout-${Date.now()}`,
    shippingAddress: {
      firstName: 'Debug',
      lastName: 'User',
      phone: '+5491100000000',
      address1: 'Fake Street 123',
      city: 'Buenos Aires',
      state: 'CABA',
      zip: '1000',
      country: 'AR',
    },
  });

  orderId = res.data.id;

  console.log('ORDER:', orderId);
}

async function createPayment() {
  logStep('CREATE PAYMENT');

  await customerApi.post(`/store/payments/${orderId}`, {
    token: 'test-token',
    paymentMethodId: 'visa',
    installments: 1,
    issuerId: 'test',
    idempotencyKey: 'debug-' + Date.now(),
  });

  console.log('PAYMENT CREATED');
}

async function updateOrderStatus(status) {
  logStep(`ORDER STATUS -> ${status.toUpperCase()}`);

  const res = await api.patch(`/orders/${orderId}/status`, {
    status,
  });

  if (res.data?.shipment?.id) {
    shipmentId = String(res.data.shipment.id);
  }

  console.log('ORDER STATUS OK:', status);
}

async function ensureShipment() {
  logStep('ENSURE SHIPMENT');

  const order = await api.get(`/orders/${orderId}`);
  const existingShipment = order.data.shipment;

  if (!existingShipment?.id) {
    throw new Error('Shipment was not created after packing the order');
  }

  shipmentId = String(existingShipment.id);

  console.log('SHIPMENT:', shipmentId);
}

async function prepareManualShipment() {
  logStep('PREPARE MANUAL SHIPMENT');

  await api.patch(`/admin/shipments/${shipmentId}/manual`, {
    carrier: 'Correo manual test',
    trackingNumber: `TEST-${Date.now()}`,
    trackingUrl: null,
    internalNotes: 'Prepared by automated smoke test',
  });

  console.log('MANUAL SHIPMENT READY');
}

async function addTracking() {
  logStep('ADD TRACKING EVENT');

  await api.post(`/admin/shipments/${shipmentId}/tracking`, {
    shipmentId,
    status: 'in_transit',
    description: 'Package moving',
    location: 'Warehouse',
  });

  console.log('TRACKING EVENT CREATED');
}

async function deliverOrder() {
  logStep('DELIVER ORDER');

  await api.patch(`/orders/${orderId}/status`, {
    status: 'delivered',
  });

  console.log('ORDER DELIVERED');
}

async function createReturn() {
  logStep('CREATE RETURN');

  const order = await api.get(`/orders/${orderId}`);

  const orderItemId = order.data.items[0].id;

  const res = await customerApi.post('/returns', {
    orderId,
    reason: 'Testing return',
    items: [
      {
        orderItemId,
        quantity: 1,
      },
    ],
  });

  returnId = res.data.id;

  console.log('RETURN:', returnId);
}

async function approveReturn() {
  logStep('APPROVE RETURN');

  await api.post(`/returns/${returnId}/approve`, {
    approve: true,
  });

  console.log('RETURN APPROVED');
}

async function createWebhook() {
  logStep('CREATE WEBHOOK');

  const res = await api.post('/admin/webhooks', {
    url: 'https://webhook.site/test',
    events: [
      'order.created',
      'payment.approved',
      'shipment.created',
      'return.approved',
    ],
  });

  webhookId = res.data.id;

  console.log('WEBHOOK:', webhookId);
}

async function run() {
  try {
    console.log('\n🚀 FULL ECOMMERCE TEST\n');

    await login();

    await createCategory();
    await createProduct();
    await linkProductCategory();

    await createVariant();
    await createInventory();

    await createCustomer();
    await loginCustomer();
    await createAddress();

    await createCart();
    await addCartItem();

    await checkout();
    await createPayment();

    await updateOrderStatus('processing');
    await updateOrderStatus('packed');
    await ensureShipment();
    await prepareManualShipment();
    await updateOrderStatus('shipped');
    await addTracking();
    await deliverOrder();

    await createReturn();
    await approveReturn();

    await createWebhook();

    console.log('\n🔥 FULL BACKEND TEST COMPLETED');
  } catch (err) {
    console.log('\n❌ ERROR');

    if (err.response) {
      console.log(err.response.data);
    } else {
      console.log(err.message);
    }
  }
}

run();
