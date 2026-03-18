"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const customerSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    storeId: true,
    createdAt: true,
    updatedAt: true,
};
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
            select: customerSelect,
        });
    }
    async findAll(storeId) {
        return this.prisma.customer.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
            select: customerSelect,
        });
    }
    async findOne(storeId, id) {
        return this.prisma.customer.findFirst({
            where: {
                id,
                storeId,
            },
            select: customerSelect,
        });
    }
    async findOneOrThrow(storeId, id) {
        const customer = await this.findOne(storeId, id);
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return customer;
    }
    async findByEmail(storeId, email) {
        return this.prisma.customer.findFirst({
            where: {
                storeId,
                email,
            },
            select: customerSelect,
        });
    }
    async update(storeId, id, data) {
        await this.findOneOrThrow(storeId, id);
        const updateData = {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
        };
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        return this.prisma.customer.update({
            where: { id },
            data: updateData,
            select: customerSelect,
        });
    }
    async remove(storeId, id) {
        await this.findOneOrThrow(storeId, id);
        return this.prisma.customer.delete({
            where: { id },
            select: customerSelect,
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
            select: customerSelect,
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map