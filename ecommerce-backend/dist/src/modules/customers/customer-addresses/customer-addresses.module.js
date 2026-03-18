"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerAddressesModule = void 0;
const common_1 = require("@nestjs/common");
const customer_addresses_controller_1 = require("./customer-addresses.controller");
const customer_addresses_service_1 = require("./customer-addresses.service");
const prisma_module_1 = require("../../../prisma/prisma.module");
let CustomerAddressesModule = class CustomerAddressesModule {
};
exports.CustomerAddressesModule = CustomerAddressesModule;
exports.CustomerAddressesModule = CustomerAddressesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [customer_addresses_controller_1.CustomerAddressesController],
        providers: [customer_addresses_service_1.CustomerAddressesService],
        exports: [customer_addresses_service_1.CustomerAddressesService],
    })
], CustomerAddressesModule);
//# sourceMappingURL=customer-addresses.module.js.map