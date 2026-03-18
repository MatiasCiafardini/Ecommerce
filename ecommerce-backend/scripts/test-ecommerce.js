const axios = require('axios');

const API = 'http://localhost:3000/api';
const STORE_ID = 1;

let token;

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

const api = axios.create({
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

  const res = await api.post('/auth/login', {
    email: 'admin@demo.com',
    password: '123456',
  });

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
  logStep('CREATE CUSTOMER');

  const res = await api.post('/customers', {
    email: `debug${Date.now()}@mail.com`,
    firstName: 'Debug',
    lastName: 'User',
  });

  customerId = res.data.id;

  console.log('CUSTOMER:', customerId);
}

async function createAddress() {
  logStep('CREATE CUSTOMER ADDRESS');

  const res = await api.post('/customer-addresses', {
    customerId,
    firstName: 'Debug',
    lastName: 'User',
    address1: 'Fake Street 123',
    city: 'Buenos Aires',
    zip: '1000',
    country: 'AR',
  });

  addressId = res.data.id;

  console.log('ADDRESS:', addressId);
}

async function createCart() {
  logStep('CREATE CART');

  const res = await api.post('/store/cart', {
    customerId,
  });

  cartId = res.data.id;

  console.log('CART:', cartId);
}

async function addCartItem() {
  logStep('ADD CART ITEM');

  await api.post(`/store/cart/${cartId}/items`, {
    variantId,
    quantity: 2,
  });

  console.log('ITEM ADDED');
}

async function checkout() {
  logStep('CHECKOUT');

  const res = await api.post(`/store/checkout/${cartId}`, {
    customerId,
  });

  orderId = res.data.id;

  console.log('ORDER:', orderId);
}

async function createPayment() {
  logStep('CREATE PAYMENT');

  await api.post(`/store/payments/${orderId}`, {
    token: 'test-token',
    paymentMethodId: 'visa',
    installments: 1,
    issuerId: 'test',
    idempotencyKey: 'debug-' + Date.now(),
  });

  console.log('PAYMENT CREATED');
}

async function getShipment() {
  logStep('GET SHIPMENT');

  const res = await api.get(`/admin/shipments`);

  shipmentId = String(res.data[0].id);

  console.log('SHIPMENT:', shipmentId);
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

async function createReturn() {
  logStep('CREATE RETURN');

  const order = await api.get(`/orders/${orderId}`);

  const orderItemId = order.data.items[0].id;

  const res = await api.post('/returns', {
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
    await createAddress();

    await createCart();
    await addCartItem();

    await checkout();
    await createPayment();

    await getShipment();
    await addTracking();

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
