"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreMiddleware = void 0;
const common_1 = require("@nestjs/common");
let StoreMiddleware = class StoreMiddleware {
    use(req, res, next) {
        const storeIdHeader = req.headers['x-store-id'];
        if (!storeIdHeader) {
            throw new common_1.BadRequestException('x-store-id header is required');
        }
        const storeId = Number(storeIdHeader);
        if (isNaN(storeId)) {
            throw new common_1.BadRequestException('x-store-id must be a number');
        }
        req.storeId = storeId;
        next();
    }
};
exports.StoreMiddleware = StoreMiddleware;
exports.StoreMiddleware = StoreMiddleware = __decorate([
    (0, common_1.Injectable)()
], StoreMiddleware);
//# sourceMappingURL=store.middleware.js.map