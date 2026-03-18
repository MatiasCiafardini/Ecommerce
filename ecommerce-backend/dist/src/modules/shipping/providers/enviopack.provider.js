"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvioPackProvider = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let EnvioPackProvider = class EnvioPackProvider {
    apiUrl = 'https://api.enviopack.com';
    async getRates(data) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/shipping/rates`, {
                postal_code: data.postalCode,
                weight: data.weight,
                declared_value: data.value,
            });
            const rates = response.data;
            return rates.map((rate) => ({
                provider: 'enviopack',
                method: rate.service || rate.name,
                price: rate.price,
                estimatedDays: rate.delivery_days ?? 3,
            }));
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Error fetching shipping rates from EnvioPack');
        }
    }
};
exports.EnvioPackProvider = EnvioPackProvider;
exports.EnvioPackProvider = EnvioPackProvider = __decorate([
    (0, common_1.Injectable)()
], EnvioPackProvider);
//# sourceMappingURL=enviopack.provider.js.map