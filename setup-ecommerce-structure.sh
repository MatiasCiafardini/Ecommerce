#!/bin/bash

echo "📦 Creating Ecommerce Platform Structure..."

# Root folders

mkdir -p ecommerce-storefront
mkdir -p ecommerce-admin
mkdir -p packages/api-client
mkdir -p packages/types
mkdir -p packages/ui
mkdir -p infrastructure/nginx
mkdir -p infrastructure/docker

#######################################

# STOREFRONT

#######################################

mkdir -p ecommerce-storefront/src/app
mkdir -p "ecommerce-storefront/src/app/(store)"
mkdir -p "ecommerce-storefront/src/app/(store)/product/[slug]"
mkdir -p "ecommerce-storefront/src/app/(store)/category/[slug]"
mkdir -p "ecommerce-storefront/src/app/(store)/cart"
mkdir -p "ecommerce-storefront/src/app/(store)/checkout"

mkdir -p ecommerce-storefront/src/engine/block-renderer
mkdir -p ecommerce-storefront/src/engine/layout-renderer
mkdir -p ecommerce-storefront/src/engine/theme-provider

mkdir -p ecommerce-storefront/src/themes/minimal
mkdir -p ecommerce-storefront/src/themes/fashion
mkdir -p ecommerce-storefront/src/themes/electronics

mkdir -p ecommerce-storefront/src/blocks/hero
mkdir -p ecommerce-storefront/src/blocks/carousel
mkdir -p ecommerce-storefront/src/blocks/product-grid
mkdir -p ecommerce-storefront/src/blocks/category-grid
mkdir -p ecommerce-storefront/src/blocks/newsletter
mkdir -p ecommerce-storefront/src/blocks/testimonials

mkdir -p ecommerce-storefront/src/layouts/one-column
mkdir -p ecommerce-storefront/src/layouts/two-columns
mkdir -p ecommerce-storefront/src/layouts/grid

mkdir -p ecommerce-storefront/src/modules/products
mkdir -p ecommerce-storefront/src/modules/cart
mkdir -p ecommerce-storefront/src/modules/checkout
mkdir -p ecommerce-storefront/src/modules/categories
mkdir -p ecommerce-storefront/src/modules/search

mkdir -p ecommerce-storefront/src/services

mkdir -p ecommerce-storefront/src/lib/tenant
mkdir -p ecommerce-storefront/src/lib/utils

mkdir -p ecommerce-storefront/src/config

mkdir -p ecommerce-storefront/src/components/ui
mkdir -p ecommerce-storefront/src/components/layout
mkdir -p ecommerce-storefront/src/components/header
mkdir -p ecommerce-storefront/src/components/footer

mkdir -p ecommerce-storefront/src/styles

#######################################

# ADMIN DASHBOARD

#######################################

mkdir -p ecommerce-admin/src/app/dashboard
mkdir -p ecommerce-admin/src/app/products
mkdir -p ecommerce-admin/src/app/orders
mkdir -p ecommerce-admin/src/app/customers
mkdir -p ecommerce-admin/src/app/discounts
mkdir -p ecommerce-admin/src/app/settings

mkdir -p ecommerce-admin/src/modules/products
mkdir -p ecommerce-admin/src/modules/orders
mkdir -p ecommerce-admin/src/modules/customers

mkdir -p ecommerce-admin/src/services

#######################################

# SHARED PACKAGES

#######################################

mkdir -p packages/api-client/src
mkdir -p packages/types/src
mkdir -p packages/ui/src

#######################################

# BASIC FILES

#######################################

touch ecommerce-storefront/src/config/block-registry.ts
touch ecommerce-storefront/src/config/theme-registry.ts

touch ecommerce-storefront/src/services/api-client.ts

touch packages/api-client/src/index.ts
touch packages/types/src/index.ts
touch packages/ui/src/index.ts

echo "✅ Structure created successfully!"
