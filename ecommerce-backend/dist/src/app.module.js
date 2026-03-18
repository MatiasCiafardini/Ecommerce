"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const store_middleware_1 = require("./core/middleware/store.middleware");
const products_module_1 = require("./modules/products/products.module");
const product_variants_module_1 = require("./modules/product-variants/product-variants.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const orders_module_1 = require("./modules/orders/orders.module");
const auth_module_1 = require("./modules/auth/auth.module");
const storefront_module_1 = require("./modules/storefront/storefront.module");
const product_images_module_1 = require("./modules/product-images/product-images.module");
const categories_module_1 = require("./modules/categories/categories.module");
const customers_module_1 = require("./modules/customers/customers.module");
const cart_module_1 = require("./modules/cart/cart.module");
const checkout_module_1 = require("./modules/checkout/checkout.module");
const payments_module_1 = require("./modules/payments/payments.module");
const shipping_module_1 = require("./modules/shipping/shipping.module");
const inventory_lock_module_1 = require("./modules/inventory-lock/inventory-lock.module");
const discounts_module_1 = require("./modules/discounts/discounts.module");
const fulfillment_module_1 = require("./modules/fulfillment/fulfillment.module");
const order_management_module_1 = require("./modules/order-management/order-management.module");
const returns_module_1 = require("./modules/returns/returns.module");
const event_bus_module_1 = require("./modules/event-bus/event-bus.module");
const webhooks_module_1 = require("./modules/webhooks/webhooks.module");
const product_options_module_1 = require("./modules/product-options/product-options.module");
const schedule_1 = require("@nestjs/schedule");
const customer_addresses_module_1 = require("./modules/customers/customer-addresses/customer-addresses.module");
const bullmq_1 = require("@nestjs/bullmq");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(store_middleware_1.StoreMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: '127.0.0.1',
                    port: 6379,
                },
            }),
            products_module_1.ProductsModule,
            product_variants_module_1.ProductVariantsModule,
            inventory_module_1.InventoryModule,
            orders_module_1.OrdersModule,
            auth_module_1.AuthModule,
            storefront_module_1.StorefrontModule,
            product_images_module_1.ProductImagesModule,
            categories_module_1.CategoriesModule,
            customers_module_1.CustomersModule,
            cart_module_1.CartModule,
            checkout_module_1.CheckoutModule,
            payments_module_1.PaymentsModule,
            shipping_module_1.ShippingModule,
            inventory_lock_module_1.InventoryLockModule,
            discounts_module_1.DiscountsModule,
            fulfillment_module_1.FulfillmentModule,
            order_management_module_1.OrderManagementModule,
            returns_module_1.ReturnsModule,
            event_bus_module_1.EventBusModule,
            webhooks_module_1.WebhooksModule,
            customer_addresses_module_1.CustomerAddressesModule,
            product_options_module_1.ProductOptionsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map