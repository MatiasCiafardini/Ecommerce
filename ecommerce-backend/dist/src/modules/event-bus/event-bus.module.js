"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_module_1 = require("../../prisma/prisma.module");
const webhooks_module_1 = require("../webhooks/webhooks.module");
const event_bus_service_1 = require("./services/event-bus/event-bus.service");
const events_processor_1 = require("./processors/events.processor");
const outbox_processor_1 = require("./processors/outbox.processor");
let EventBusModule = class EventBusModule {
};
exports.EventBusModule = EventBusModule;
exports.EventBusModule = EventBusModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            webhooks_module_1.WebhooksModule,
            bullmq_1.BullModule.registerQueue({ name: 'events' }, { name: 'outbox' }),
        ],
        providers: [event_bus_service_1.EventBusService, events_processor_1.EventsProcessor, outbox_processor_1.OutboxProcessor],
        exports: [event_bus_service_1.EventBusService],
    })
], EventBusModule);
//# sourceMappingURL=event-bus.module.js.map