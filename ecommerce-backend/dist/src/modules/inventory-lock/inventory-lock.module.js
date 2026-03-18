"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryLockModule = void 0;
const common_1 = require("@nestjs/common");
const inventory_lock_service_1 = require("./inventory-lock.service");
const prisma_module_1 = require("../../prisma/prisma.module");
let InventoryLockModule = class InventoryLockModule {
};
exports.InventoryLockModule = InventoryLockModule;
exports.InventoryLockModule = InventoryLockModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [inventory_lock_service_1.InventoryLockService],
        exports: [inventory_lock_service_1.InventoryLockService],
    })
], InventoryLockModule);
//# sourceMappingURL=inventory-lock.module.js.map