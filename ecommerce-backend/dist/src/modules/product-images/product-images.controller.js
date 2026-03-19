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
exports.ProductImagesController = void 0;
const common_1 = require("@nestjs/common");
const product_images_service_1 = require("./product-images.service");
const create_product_image_dto_1 = require("./dto/create-product-image.dto");
const swagger_1 = require("@nestjs/swagger");
const admin_auth_guard_1 = require("../auth/guards/admin-auth.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
let ProductImagesController = class ProductImagesController {
    service;
    constructor(service) {
        this.service = service;
    }
    upload(productId, file) {
        return this.service.create(Number(productId), {
            url: `/uploads/${file.filename}`,
        });
    }
    create(productId, dto) {
        return this.service.create(Number(productId), dto);
    }
    findAll(productId) {
        return this.service.findByProduct(Number(productId));
    }
    remove(id) {
        return this.service.delete(Number(id));
    }
};
exports.ProductImagesController = ProductImagesController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (_, file, callback) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                callback(null, `${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
    })),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProductImagesController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_product_image_dto_1.CreateProductImageDto]),
    __metadata("design:returntype", void 0)
], ProductImagesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductImagesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductImagesController.prototype, "remove", null);
exports.ProductImagesController = ProductImagesController = __decorate([
    (0, swagger_1.ApiSecurity)('x-store-id'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiTags)('Product Images'),
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, common_1.Controller)('products/:productId/images'),
    __metadata("design:paramtypes", [product_images_service_1.ProductImagesService])
], ProductImagesController);
//# sourceMappingURL=product-images.controller.js.map