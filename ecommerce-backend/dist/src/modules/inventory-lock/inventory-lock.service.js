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
exports.InventoryLockService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InventoryLockService = class InventoryLockService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async reserveStock(storeId, variantId, quantity) {
        return this.prisma.$transaction((tx) => this.reserveStockTx(tx, storeId, variantId, quantity));
    }
    async reserveStockTx(tx, storeId, variantId, quantity) {
        const rows = await tx.$queryRawUnsafe(`
      SELECT *
      FROM "Inventory"
      WHERE "variantId" = $1
      AND "storeId" = $2
      FOR UPDATE
      `, variantId, storeId);
        if (!rows.length) {
            throw new common_1.BadRequestException('Inventory not found');
        }
        const inventory = rows[0];
        const available = inventory.quantity - inventory.reserved;
        if (available < quantity) {
            throw new common_1.BadRequestException('Not enough stock available');
        }
        return tx.inventory.update({
            where: {
                storeId_variantId: {
                    storeId,
                    variantId,
                },
            },
            data: {
                reserved: {
                    increment: quantity,
                },
            },
        });
    }
    async releaseStock(storeId, variantId, quantity) {
        return this.prisma.$transaction((tx) => this.releaseStockTx(tx, storeId, variantId, quantity));
    }
    async releaseStockTx(tx, storeId, variantId, quantity) {
        const inventory = await tx.inventory.findUnique({
            where: {
                storeId_variantId: {
                    storeId,
                    variantId,
                },
            },
        });
        if (!inventory) {
            throw new common_1.BadRequestException('Inventory not found');
        }
        return tx.inventory.update({
            where: {
                storeId_variantId: {
                    storeId,
                    variantId,
                },
            },
            data: {
                reserved: {
                    decrement: quantity,
                },
            },
        });
    }
    async confirmStock(storeId, variantId, quantity) {
        return this.prisma.$transaction((tx) => this.confirmStockTx(tx, storeId, variantId, quantity));
    }
    async confirmStockTx(tx, storeId, variantId, quantity) {
        const inventory = await tx.inventory.findUnique({
            where: {
                storeId_variantId: {
                    storeId,
                    variantId,
                },
            },
        });
        if (!inventory) {
            throw new common_1.BadRequestException('Inventory not found');
        }
        if (inventory.reserved < quantity) {
            throw new common_1.BadRequestException('Invalid reserved stock');
        }
        return tx.inventory.update({
            where: {
                storeId_variantId: {
                    storeId,
                    variantId,
                },
            },
            data: {
                quantity: {
                    decrement: quantity,
                },
                reserved: {
                    decrement: quantity,
                },
            },
        });
    }
};
exports.InventoryLockService = InventoryLockService;
exports.InventoryLockService = InventoryLockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryLockService);
//# sourceMappingURL=inventory-lock.service.js.map