export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
}

export const ORDER_CREATED_EVENT = 'order.created';
