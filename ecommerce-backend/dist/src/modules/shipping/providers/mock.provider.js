"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockShippingProvider = void 0;
const common_1 = require("@nestjs/common");
let MockShippingProvider = class MockShippingProvider {
    async getRates(data) {
        return [
            {
                provider: 'andreani',
                method: 'standard',
                price: 2500,
                estimatedDays: 3,
            },
            {
                provider: 'correo-argentino',
                method: 'clasico',
                price: 2200,
                estimatedDays: 4,
            },
            {
                provider: 'store',
                method: 'pickup',
                price: 0,
                estimatedDays: 0,
            },
        ];
    }
};
exports.MockShippingProvider = MockShippingProvider;
exports.MockShippingProvider = MockShippingProvider = __decorate([
    (0, common_1.Injectable)()
], MockShippingProvider);
//# sourceMappingURL=mock.provider.js.map