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
exports.CustomerAddressesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const addressSelect = {
    id: true,
    customerId: true,
    storeId: true,
    firstName: true,
    lastName: true,
    phone: true,
    address1: true,
    address2: true,
    city: true,
    state: true,
    zip: true,
    country: true,
    isDefault: true,
    createdAt: true,
};
let CustomerAddressesService = class CustomerAddressesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(storeId, customerId, dto) {
        const customer = await this.prisma.customer.findFirst({
            where: {
                id: customerId,
                storeId,
            },
            select: { id: true },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return this.prisma.customerAddress.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                address1: dto.address1,
                address2: dto.address2,
                city: dto.city,
                state: dto.state,
                zip: dto.zip,
                country: dto.country,
                store: {
                    connect: {
                        id: storeId,
                    },
                },
                customer: {
                    connect: {
                        id: customerId,
                    },
                },
            },
            select: addressSelect,
        });
    }
    async findByCustomer(storeId, customerId) {
        return this.prisma.customerAddress.findMany({
            where: {
                customerId,
                customer: {
                    storeId,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: addressSelect,
        });
    }
    async update(storeId, customerId, addressId, dto) {
        await this.findOneOrThrow(storeId, customerId, addressId);
        return this.prisma.customerAddress.update({
            where: {
                id: addressId,
            },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                address1: dto.address1,
                address2: dto.address2,
                city: dto.city,
                state: dto.state,
                zip: dto.zip,
                country: dto.country,
            },
            select: addressSelect,
        });
    }
    async remove(storeId, customerId, addressId) {
        await this.findOneOrThrow(storeId, customerId, addressId);
        return this.prisma.customerAddress.delete({
            where: {
                id: addressId,
            },
            select: addressSelect,
        });
    }
    async findOneOrThrow(storeId, customerId, addressId) {
        const address = await this.prisma.customerAddress.findFirst({
            where: {
                id: addressId,
                customerId,
                customer: {
                    storeId,
                },
            },
            select: addressSelect,
        });
        if (!address) {
            throw new common_1.NotFoundException('Address not found');
        }
        return address;
    }
};
exports.CustomerAddressesService = CustomerAddressesService;
exports.CustomerAddressesService = CustomerAddressesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerAddressesService);
//# sourceMappingURL=customer-addresses.service.js.map