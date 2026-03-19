"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateVariantDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_variant_dto_1 = require("./create-variant.dto");
class UpdateVariantDto extends (0, swagger_1.PartialType)(create_variant_dto_1.CreateVariantDto) {
}
exports.UpdateVariantDto = UpdateVariantDto;
//# sourceMappingURL=update-variant.dto.js.map