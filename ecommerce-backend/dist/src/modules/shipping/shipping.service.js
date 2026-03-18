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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ShippingService = class ShippingService {
    prisma;
    provider;
    constructor(prisma, provider) {
        this.prisma = prisma;
        this.provider = provider;
    }
    async getOptions(storeId, cartId, customerId, postalCode) {
        const cart = await this.prisma.cart.findFirst({
            where: {
                id: cartId,
                storeId,
            },
            include: {
                items: {
                    include: {
                        variant: true,
                    },
                },
            },
        });
        if (!cart) {
            throw new common_1.NotFoundException('Cart not found');
        }
        if (cart.customerId !== customerId) {
            throw new common_1.ForbiddenException('Cart does not belong to this customer');
        }
        if (!cart.items.length) {
            throw new common_1.BadRequestException('Cart is empty');
        }
        let weight = 0;
        let value = 0;
        for (const item of cart.items) {
            weight += (item.variant.weight ?? 0) * item.quantity;
            value += Number(item.variant.price) * item.quantity;
        }
        return this.provider.getRates({
            postalCode,
            weight,
            value,
        });
    }
};
exports.ShippingService = ShippingService;
exports.ShippingService = ShippingService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('ShippingProvider')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], ShippingService);
//# sourceMappingURL=shipping.service.js.map