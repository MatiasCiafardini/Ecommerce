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
let CustomerAddressesService = class CustomerAddressesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.customerAddress.create({
            data: {
                customerId: dto.customerId,
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
        });
    }
    async findByCustomer(customerId) {
        return this.prisma.customerAddress.findMany({
            where: {
                customerId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
};
exports.CustomerAddressesService = CustomerAddressesService;
exports.CustomerAddressesService = CustomerAddressesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerAddressesService);
//# sourceMappingURL=customer-addresses.service.js.map