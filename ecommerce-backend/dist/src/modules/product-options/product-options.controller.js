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
exports.ProductOptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_auth_guard_1 = require("../auth/guards/admin-auth.guard");
const product_options_service_1 = require("./product-options.service");
const create_product_option_dto_1 = require("./dto/create-product-option.dto");
const add_product_option_value_dto_1 = require("./dto/add-product-option-value.dto");
let ProductOptionsController = class ProductOptionsController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAllOptions(req) {
        return this.service.findAllOptions(req.storeId);
    }
    createOption(req, dto) {
        return this.service.createOption(req.storeId, dto);
    }
    addValueToProduct(req, productId, dto) {
        return this.service.addValueToProduct(req.storeId, Number(productId), dto);
    }
    findValuesByProduct(req, productId) {
        return this.service.findValuesByProduct(req.storeId, Number(productId));
    }
    removeValueFromProduct(req, productId, id) {
        return this.service.removeValueFromProduct(req.storeId, Number(productId), Number(id));
    }
};
exports.ProductOptionsController = ProductOptionsController;
__decorate([
    (0, common_1.Get)('product-options'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProductOptionsController.prototype, "findAllOptions", null);
__decorate([
    (0, common_1.Post)('product-options'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_product_option_dto_1.CreateProductOptionDto]),
    __metadata("design:returntype", void 0)
], ProductOptionsController.prototype, "createOption", null);
__decorate([
    (0, common_1.Post)('products/:productId/option-values'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, add_product_option_value_dto_1.AddProductOptionValueDto]),
    __metadata("design:returntype", void 0)
], ProductOptionsController.prototype, "addValueToProduct", null);
__decorate([
    (0, common_1.Get)('products/:productId/option-values'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProductOptionsController.prototype, "findValuesByProduct", null);
__decorate([
    (0, common_1.Delete)('products/:productId/option-values/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProductOptionsController.prototype, "removeValueFromProduct", null);
exports.ProductOptionsController = ProductOptionsController = __decorate([
    (0, swagger_1.ApiSecurity)('x-store-id'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiTags)('Product Options'),
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [product_options_service_1.ProductOptionsService])
], ProductOptionsController);
//# sourceMappingURL=product-options.controller.js.map