"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountsModule = void 0;
const common_1 = require("@nestjs/common");
const discounts_service_1 = require("./discounts.service");
const discounts_controller_1 = require("./discounts.controller");
const prisma_module_1 = require("../../prisma/prisma.module");
const discount_engine_service_1 = require("./engine/discount-engine.service");
const automatic_discount_service_1 = require("./automatic-discounts/automatic-discount.service");
let DiscountsModule = class DiscountsModule {
};
exports.DiscountsModule = DiscountsModule;
exports.DiscountsModule = DiscountsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [discounts_controller_1.DiscountsController],
        providers: [
            discounts_service_1.DiscountsService,
            discount_engine_service_1.DiscountEngineService,
            automatic_discount_service_1.AutomaticDiscountService,
        ],
        exports: [discounts_service_1.DiscountsService, discount_engine_service_1.DiscountEngineService],
    })
], DiscountsModule);
//# sourceMappingURL=discounts.module.js.map