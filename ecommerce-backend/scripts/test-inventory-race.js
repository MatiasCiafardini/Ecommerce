const axios = require('axios');

const API = process.env.BACKEND_API_URL || 'http://localhost:3000/api';
const STORE_ID = Number(process.env.TEST_STORE_ID || 1);

const api = axios.create({
  baseURL: API,
  headers: { 'x-store-id': STORE_ID },
});

let token;
let variantId;
const ADMIN_PASSWORD_CANDIDATES = process.env.TEST_ADMIN_PASSWORD
  ? [process.env.TEST_ADMIN_PASSWORD]
  : ['admin123', '123456'];

async function login() {
  let res;
  let lastError;

  for (const password of ADMIN_PASSWORD_CANDIDATES) {
    try {
      res = await api.post('/auth/login', {
        email: 'admin@demo.com',
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
}

async function setupProduct() {
  const category = await api.post('/categories', {
    name: 'RaceTest-' + Date.now(),
  });

  const product = await api.post('/products', {
    title: 'Race Product',
    description: 'Inventory race test',
  });

  await api.post(`/products/${product.data.id}/categories/${category.data.id}`);

  const variant = await api.post('/variants', {
    productId: product.data.id,
    sku: 'RACE-' + Date.now(),
    price: 100,
  });

  variantId = variant.data.id;

  await api.post('/inventory', {
    variantId,
    quantity: 1,
  });
}

async function attemptPurchase(i) {
  try {
    const customer = await api.post('/customers', {
      email: `race${Date.now()}${i}@test.com`,
    });

    const cart = await api.post('/store/cart', {
      customerId: customer.data.id,
    });

    await api.post(`/store/cart/${cart.data.id}/items`, {
      variantId,
      quantity: 1,
    });

    const checkout = await api.post(`/store/checkout/${cart.data.id}`, {
      customerId: customer.data.id,
    });

    console.log('ORDER SUCCESS', checkout.data.id);
    return true;
  } catch (err) {
    console.log('ORDER FAILED', i);
    return false;
  }
}

async function run() {
  console.log('\n🔥 INVENTORY RACE TEST\n');

  await login();
  await setupProduct();

  const attempts = 10;

  const results = await Promise.all(
    Array.from({ length: attempts }).map((_, i) => attemptPurchase(i)),
  );

  const success = results.filter(Boolean).length;

  console.log('\nRESULT:');
  console.log('attempts:', attempts);
  console.log('successful orders:', success);

  if (success > 1) {
    console.log('❌ INVENTORY BUG: overselling detected');
  } else {
    console.log('✅ inventory lock working correctly');
  }
}

run();
