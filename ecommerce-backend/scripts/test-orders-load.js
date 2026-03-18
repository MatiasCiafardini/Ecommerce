const axios = require('axios');

const API = 'http://localhost:3000/api';
const STORE_ID = 1;

const api = axios.create({
  baseURL: API,
  headers: {
    'x-store-id': STORE_ID,
  },
});

let token;
let variantId;

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

async function setupProduct() {
  logStep('SETUP PRODUCT');

  const category = await api.post('/categories', {
    name: 'LoadTest-' + Date.now(),
  });

  const product = await api.post('/products', {
    title: 'Load Product ' + Date.now(),
    description: 'Load test product',
  });

  await api.post(`/products/${product.data.id}/categories/${category.data.id}`);

  const variant = await api.post('/variants', {
    productId: product.data.id,
    sku: 'LOAD-' + Date.now(),
    price: 100,
  });

  variantId = variant.data.id;

  await api.post('/inventory', {
    variantId,
    quantity: 1000,
  });

  console.log('TEST VARIANT:', variantId);
}

async function createCustomer(i) {
  const res = await api.post('/customers', {
    email: `load${Date.now()}${i}@test.com`,
    firstName: 'Load',
    lastName: 'Tester',
  });

  return res.data.id;
}

async function createOrder(customerId) {
  const cart = await api.post('/store/cart', {
    customerId,
  });

  await api.post(`/store/cart/${cart.data.id}/items`, {
    variantId,
    quantity: 1,
  });

  const checkout = await api.post(`/store/checkout/${cart.data.id}`, {
    customerId,
  });

  return checkout.data.id;
}

async function run() {
  try {
    console.log('\n🔥 LOAD TEST STARTED\n');

    await login();
    await setupProduct();

    const totalOrders = 50;

    const start = Date.now();

    for (let i = 0; i < totalOrders; i++) {
      const customerId = await createCustomer(i);

      const orderId = await createOrder(customerId);

      console.log('ORDER CREATED:', orderId);
    }

    const seconds = (Date.now() - start) / 1000;

    console.log('\n==============================');
    console.log('LOAD TEST RESULT');
    console.log('==============================\n');

    console.log('ORDERS CREATED:', totalOrders);
    console.log('TIME:', seconds, 'seconds');
    console.log(
      'AVG ORDER TIME:',
      (seconds / totalOrders).toFixed(2),
      'seconds',
    );

    console.log('\n🔥 LOAD TEST COMPLETED');
  } catch (err) {
    console.log('\n❌ LOAD TEST ERROR');

    if (err.response) {
      console.log(err.response.data);
    } else {
      console.log(err.message);
    }
  }
}

run();
