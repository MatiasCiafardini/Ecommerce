import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    service = Object.create(ProductsService.prototype) as ProductsService;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('filters the complete admin catalog to products with images', () => {
    const where = (service as any).buildAdminCatalogWhere(7, {
      imageStatus: 'with-images',
    });

    expect(where.images).toEqual({ some: {} });
  });

  it('filters the complete admin catalog to products without images', () => {
    const where = (service as any).buildAdminCatalogWhere(7, {
      imageStatus: 'without-images',
    });

    expect(where.images).toEqual({ none: {} });
  });
});
