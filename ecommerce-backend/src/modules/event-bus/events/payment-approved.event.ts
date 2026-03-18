export interface PaymentApprovedPayload {
  paymentId: string;
  orderId: string;
}

export const PAYMENT_APPROVED_EVENT = 'payment.approved';
