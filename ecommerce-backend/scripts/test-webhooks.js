const axios = require('axios');

const API = 'http://localhost:3000/api';
const STORE_ID = 1;

const api = axios.create({
  baseURL: API,
  headers: { 'x-store-id': STORE_ID },
});

let token;

async function login() {
  const res = await api.post('/auth/login', {
    email: 'admin@demo.com',
    password: '123456',
  });

  token = res.data.access_token;
  api.defaults.headers.Authorization = `Bearer ${token}`;
}

async function createWebhook() {
  const res = await api.post('/admin/webhooks', {
    url: 'https://webhook.site/test',
    events: ['order.created', 'payment.approved', 'shipment.created'],
  });
  console.log('\nTriggering event...\n');

  await api.post('/admin/webhooks/test-event');
  return res.data.id;
}

async function checkDeliveries(webhookId) {
  const res = await api.get(`/admin/webhooks/${webhookId}`);

  console.log('deliveries:', res.data.deliveries?.length || 0);
}

async function run() {
  console.log('\n🔥 WEBHOOK TEST\n');

  await login();

  const webhookId = await createWebhook();

  console.log('webhook:', webhookId);

  setTimeout(async () => {
    await checkDeliveries(webhookId);
  }, 5000);
}

run();
