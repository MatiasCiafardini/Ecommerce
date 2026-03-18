"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const shipping_service_1 = require("./shipping.service");
const shipping_controller_1 = require("./shipping.controller");
const mock_provider_1 = require("./providers/mock.provider");
const enviopack_provider_1 = require("./providers/enviopack.provider");
let ShippingModule = class ShippingModule {
};
exports.ShippingModule = ShippingModule;
exports.ShippingModule = ShippingModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [shipping_controller_1.ShippingController],
        providers: [
            shipping_service_1.ShippingService,
            {
                provide: 'ShippingProvider',
                useClass: process.env.NODE_ENV === 'production'
                    ? enviopack_provider_1.EnvioPackProvider
                    : mock_provider_1.MockShippingProvider,
            },
        ],
        exports: [shipping_service_1.ShippingService],
    })
], ShippingModule);
//# sourceMappingURL=shipping.module.js.map