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
exports.FulfillmentService = void 0;
const common_1 = require("@nestjs/common");
const shipment_service_1 = require("./services/shipment.service");
const tracking_service_1 = require("./services/tracking.service");
let FulfillmentService = class FulfillmentService {
    shipmentService;
    trackingService;
    constructor(shipmentService, trackingService) {
        this.shipmentService = shipmentService;
        this.trackingService = trackingService;
    }
    async createShipment(storeId, dto) {
        return this.shipmentService.createShipment(Number(storeId), dto);
    }
    async getShipments(storeId) {
        return this.shipmentService.findAll(Number(storeId));
    }
    async getShipment(storeId, shipmentId) {
        return this.shipmentService.findOne(Number(storeId), shipmentId);
    }
    async addTracking(storeId, dto) {
        return this.trackingService.addTrackingEvent(Number(storeId), dto);
    }
};
exports.FulfillmentService = FulfillmentService;
exports.FulfillmentService = FulfillmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [shipment_service_1.ShipmentService,
        tracking_service_1.TrackingService])
], FulfillmentService);
//# sourceMappingURL=fulfillment.service.js.map