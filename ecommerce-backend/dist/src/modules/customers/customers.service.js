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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CustomersService = class CustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(storeId, data) {
        return this.prisma.customer.create({
            data: {
                ...data,
                storeId,
            },
        });
    }
    async findAll(storeId) {
        return this.prisma.customer.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(storeId, id) {
        return this.prisma.customer.findFirst({
            where: {
                id,
                storeId,
            },
        });
    }
    async findByEmail(storeId, email) {
        return this.prisma.customer.findFirst({
            where: {
                storeId,
                email,
            },
        });
    }
    async update(storeId, id, data) {
        return this.prisma.customer.update({
            where: { id },
            data,
        });
    }
    async remove(storeId, id) {
        return this.prisma.customer.delete({
            where: { id },
        });
    }
    async upsertCustomer(storeId, data) {
        return this.prisma.customer.upsert({
            where: {
                storeId_email: {
                    storeId,
                    email: data.email,
                },
            },
            update: {
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
            },
            create: {
                ...data,
                storeId,
            },
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map