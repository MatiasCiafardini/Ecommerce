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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerOrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const orders_service_1 = require("./orders.service");
let CustomerOrdersController = class CustomerOrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    findMine(req) {
        return this.ordersService.findMine(req.storeId, req.user.sub);
    }
    findOneMine(id, req) {
        return this.ordersService.findOneMine(Number(id), req.storeId, req.user.sub);
    }
};
exports.CustomerOrdersController = CustomerOrdersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomerOrdersController.prototype, "findMine", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CustomerOrdersController.prototype, "findOneMine", null);
exports.CustomerOrdersController = CustomerOrdersController = __decorate([
    (0, swagger_1.ApiSecurity)('x-store-id'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiTags)('Customer Orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('customers/me/orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], CustomerOrdersController);
//# sourceMappingURL=customer-orders.controller.js.map