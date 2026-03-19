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
exports.ProductVariantsController = void 0;
const common_1 = require("@nestjs/common");
const product_variants_service_1 = require("./product-variants.service");
const create_variant_dto_1 = require("./dto/create-variant.dto");
const update_variant_dto_1 = require("./dto/update-variant.dto");
const swagger_1 = require("@nestjs/swagger");
const admin_auth_guard_1 = require("../auth/guards/admin-auth.guard");
let ProductVariantsController = class ProductVariantsController {
    variantsService;
    constructor(variantsService) {
        this.variantsService = variantsService;
    }
    create(createVariantDto, req) {
        return this.variantsService.create(createVariantDto, req.storeId);
    }
    update(id, updateVariantDto, req) {
        return this.variantsService.update(Number(id), updateVariantDto, req.storeId);
    }
    remove(id, req) {
        return this.variantsService.remove(Number(id), req.storeId);
    }
    findByProduct(productId, req) {
        return this.variantsService.findByProduct(Number(productId), req.storeId);
    }
};
exports.ProductVariantsController = ProductVariantsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_variant_dto_1.CreateVariantDto, Object]),
    __metadata("design:returntype", void 0)
], ProductVariantsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_variant_dto_1.UpdateVariantDto, Object]),
    __metadata("design:returntype", void 0)
], ProductVariantsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProductVariantsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':productId'),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProductVariantsController.prototype, "findByProduct", null);
exports.ProductVariantsController = ProductVariantsController = __decorate([
    (0, swagger_1.ApiSecurity)('x-store-id'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiTags)('Variants'),
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, common_1.Controller)('variants'),
    __metadata("design:paramtypes", [product_variants_service_1.ProductVariantsService])
], ProductVariantsController);
//# sourceMappingURL=product-variants.controller.js.map