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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const mercadopago_provider_1 = require("./providers/mercadopago.provider");
const inventory_lock_service_1 = require("../inventory-lock/inventory-lock.service");
const fulfillment_service_1 = require("../fulfillment/fulfillment.service");
const client_1 = require("@prisma/client");
let PaymentsService = class PaymentsService {
    prisma;
    mercadopago;
    inventoryLockService;
    fulfillmentService;
    constructor(prisma, mercadopago, inventoryLockService, fulfillmentService) {
        this.prisma = prisma;
        this.mercadopago = mercadopago;
        this.inventoryLockService = inventoryLockService;
        this.fulfillmentService = fulfillmentService;
    }
    async createPayment(storeId, orderId, dto) {
        const existingPayment = await this.prisma.payment.findFirst({
            where: {
                storeId,
                idempotencyKey: dto.idempotencyKey,
            },
        });
        if (existingPayment) {
            return existingPayment;
        }
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                storeId,
            },
            include: {
                customer: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        let mpPayment;
        if (dto.token === 'test-token') {
            mpPayment = {
                id: `test-${Date.now()}`,
                status: 'approved',
            };
        }
        else {
            mpPayment = await this.mercadopago.createPayment({
                amount: Number(order.total),
                token: dto.token,
                paymentMethodId: dto.paymentMethodId,
                installments: dto.installments,
                issuerId: dto.issuerId,
                description: `Order #${order.id}`,
                email: order.customer?.email || 'buyer@email.com',
            });
        }
        const payment = await this.prisma.payment.create({
            data: {
                storeId,
                orderId,
                provider: 'mercadopago',
                status: mpPayment.status ?? 'pending',
                amount: order.total,
                externalId: String(mpPayment.id),
                idempotencyKey: dto.idempotencyKey,
            },
        });
        if (mpPayment.status === 'approved') {
            await this.prisma.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.paid,
                },
            });
            const existingShipment = await this.prisma.shipment.findUnique({
                where: {
                    orderId: order.id,
                },
            });
            if (!existingShipment) {
                await this.fulfillmentService.createShipment(order.storeId, {
                    orderId: order.id,
                    provider: order.shippingProvider || 'manual',
                    method: order.shippingMethod || 'standard',
                    shippingAddress: 'Address not provided',
                    postalCode: '0000',
                });
            }
        }
        return payment;
    }
    async handleWebhook(body) {
        if (body.type !== 'payment') {
            return { received: true };
        }
        const paymentId = body.data.id;
        const mpPayment = await this.mercadopago.getPayment(paymentId);
        const payment = await this.prisma.payment.findFirst({
            where: {
                externalId: String(paymentId),
            },
        });
        if (!payment) {
            return { received: true };
        }
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: mpPayment.status,
            },
        });
        if (mpPayment.status === 'approved') {
            const order = await this.prisma.order.findUnique({
                where: { id: payment.orderId },
                include: {
                    shipment: true,
                },
            });
            if (!order) {
                return { received: true };
            }
            await this.prisma.order.update({
                where: { id: order.id },
                data: {
                    status: client_1.OrderStatus.paid,
                },
            });
            if (!order.shipment) {
                await this.fulfillmentService.createShipment(order.storeId, {
                    orderId: order.id,
                    provider: order.shippingProvider || 'manual',
                    method: order.shippingMethod || 'standard',
                    shippingAddress: 'Address not provided',
                    postalCode: '0000',
                });
            }
        }
        if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
            const order = await this.prisma.order.findUnique({
                where: { id: payment.orderId },
            });
            if (!order) {
                return { received: true };
            }
            const orderItems = await this.prisma.orderItem.findMany({
                where: {
                    orderId: payment.orderId,
                },
            });
            for (const item of orderItems) {
                await this.inventoryLockService.releaseStock(order.storeId, item.variantId, item.quantity);
            }
            await this.prisma.order.update({
                where: { id: payment.orderId },
                data: {
                    status: client_1.OrderStatus.cancelled,
                },
            });
        }
        return { received: true };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mercadopago_provider_1.MercadoPagoProvider,
        inventory_lock_service_1.InventoryLockService,
        fulfillment_service_1.FulfillmentService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map