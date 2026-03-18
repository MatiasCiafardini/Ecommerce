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
exports.CustomerAddressesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const customer_addresses_service_1 = require("./customer-addresses.service");
const create_customer_address_dto_1 = require("./dto/create-customer-address.dto");
const update_customer_address_dto_1 = require("./dto/update-customer-address.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
let CustomerAddressesController = class CustomerAddressesController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(req, dto) {
        return this.service.create(req.storeId, req.user.sub, dto);
    }
    findMine(req) {
        return this.service.findByCustomer(req.storeId, req.user.sub);
    }
    update(req, id, dto) {
        return this.service.update(req.storeId, req.user.sub, Number(id), dto);
    }
    remove(req, id) {
        return this.service.remove(req.storeId, req.user.sub, Number(id));
    }
};
exports.CustomerAddressesController = CustomerAddressesController;
__decorate([
    (0, common_1.Post)('me'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_customer_address_dto_1.CreateCustomerAddressDto]),
    __metadata("design:returntype", void 0)
], CustomerAddressesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomerAddressesController.prototype, "findMine", null);
__decorate([
    (0, common_1.Patch)('me/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_customer_address_dto_1.UpdateCustomerAddressDto]),
    __metadata("design:returntype", void 0)
], CustomerAddressesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('me/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CustomerAddressesController.prototype, "remove", null);
exports.CustomerAddressesController = CustomerAddressesController = __decorate([
    (0, swagger_1.ApiTags)('Customer Addresses'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('customer-addresses'),
    __metadata("design:paramtypes", [customer_addresses_service_1.CustomerAddressesService])
], CustomerAddressesController);
//# sourceMappingURL=customer-addresses.controller.js.map