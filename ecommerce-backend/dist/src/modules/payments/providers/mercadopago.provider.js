"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoProvider = void 0;
const common_1 = require("@nestjs/common");
const mercadopago_1 = require("mercadopago");
let MercadoPagoProvider = class MercadoPagoProvider {
    client;
    accessToken;
    constructor() {
        this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        this.client = new mercadopago_1.MercadoPagoConfig({
            accessToken: this.accessToken,
        });
    }
    async createPayment(data) {
        const payment = new mercadopago_1.Payment(this.client);
        const result = await payment.create({
            body: {
                transaction_amount: data.amount,
                token: data.token,
                description: data.description,
                installments: data.installments,
                payment_method_id: data.paymentMethodId,
                issuer_id: data.issuerId,
                payer: {
                    email: data.email,
                },
            },
        });
        return result;
    }
    async getPayment(paymentId) {
        const payment = new mercadopago_1.Payment(this.client);
        const result = await payment.get({
            id: paymentId,
        });
        return result;
    }
    async refundPayment(paymentId, amount) {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(amount ? { amount } : {}),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`MercadoPago refund failed: ${error}`);
        }
        return response.json();
    }
};
exports.MercadoPagoProvider = MercadoPagoProvider;
exports.MercadoPagoProvider = MercadoPagoProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MercadoPagoProvider);
//# sourceMappingURL=mercadopago.provider.js.map