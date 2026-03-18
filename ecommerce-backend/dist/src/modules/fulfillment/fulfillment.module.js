"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentModule = void 0;
const common_1 = require("@nestjs/common");
const fulfillment_service_1 = require("./fulfillment.service");
const fulfillment_controller_1 = require("./fulfillment.controller");
const prisma_module_1 = require("../../prisma/prisma.module");
const shipment_service_1 = require("./services/shipment.service");
const tracking_service_1 = require("./services/tracking.service");
const tracking_sync_service_1 = require("./services/tracking-sync.service");
let FulfillmentModule = class FulfillmentModule {
};
exports.FulfillmentModule = FulfillmentModule;
exports.FulfillmentModule = FulfillmentModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [fulfillment_controller_1.FulfillmentController],
        providers: [
            fulfillment_service_1.FulfillmentService,
            shipment_service_1.ShipmentService,
            tracking_service_1.TrackingService,
            tracking_sync_service_1.TrackingSyncService,
        ],
        exports: [fulfillment_service_1.FulfillmentService],
    })
], FulfillmentModule);
//# sourceMappingURL=fulfillment.module.js.map