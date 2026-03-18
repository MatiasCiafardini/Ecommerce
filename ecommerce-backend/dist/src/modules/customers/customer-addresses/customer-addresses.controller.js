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
let CustomerAddressesController = class CustomerAddressesController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto) {
        return this.service.create(dto);
    }
    findByCustomer(customerId) {
        return this.service.findByCustomer(Number(customerId));
    }
};
exports.CustomerAddressesController = CustomerAddressesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_customer_address_dto_1.CreateCustomerAddressDto]),
    __metadata("design:returntype", void 0)
], CustomerAddressesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':customerId'),
    __param(0, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CustomerAddressesController.prototype, "findByCustomer", null);
exports.CustomerAddressesController = CustomerAddressesController = __decorate([
    (0, swagger_1.ApiTags)('Customer Addresses'),
    (0, common_1.Controller)('customer-addresses'),
    __metadata("design:paramtypes", [customer_addresses_service_1.CustomerAddressesService])
], CustomerAddressesController);
//# sourceMappingURL=customer-addresses.controller.js.map