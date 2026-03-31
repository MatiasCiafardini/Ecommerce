"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getClientStoreId } from "@/lib/tenant/store-context";
import { money } from "./order-utils";
import type { AdminPromotion } from "./admin-types";

type Category = { id: number; name: string; slug: string; storeId?: number | null };
type Product = { id: number; title: string; slug: string };
type Variant = {
  id: number;
  sku: string;
  price: number | string;
  Size?: string | null;
  Color?: string | null;
  product: { id: number; title: string; slug: string };
};
type ProductOption = {
  id: number;
  name: string;
  reusableValues?: Array<{ id: number; value: string; productsCount?: number }>;
};

type DiscountScope = "order" | "product" | "category" | "variant" | "option" | "option_value";
type DiscountType = "percentage" | "fixed_amount" | "free_shipping";
type ScopeOption = {
  id: DiscountScope;
  label: string;
  description: string;
};

const scopeOptions: ScopeOption[] = [
  {
    id: "order",
    label: "Pedido completo",
    description: "Ideal para cupones, promos automáticas por monto o envío gratis.",
  },
  {
    id: "category",
    label: "Colecciones",
    description: "Aplica sobre categorías completas, como Remeras o Abrigos.",
  },
  {
    id: "product",
    label: "Productos",
    description: "Sirve para campañas sobre SKUs o lanzamientos puntuales.",
  },
  {
    id: "variant",
    label: "Variantes",
    description: "Pensado para talle, color o SKU específico con precio propio.",
  },
  {
    id: "option",
    label: "Etiquetas",
    description: "Aplica a cualquier producto que use una etiqueta como Color, Talle o Material.",
  },
  {
    id: "option_value",
    label: "Valores de opción",
    description: "Agrupa cosas como Color = Negro o Material = Lino dentro de toda la tienda.",
  },
];

const initialForm = {
  name: "",
  scope: "order" as DiscountScope,
  type: "percentage" as DiscountType,
  value: "10",
  minimumAmount: "",
  automatic: true,
  startsAt: "",
  endsAt: "",
  couponCode: "",
  couponUsageLimit: "",
};

function scopeCategoriesToActiveStore(items: Category[]) {
  const storeId = (() => {
    try {
      return getClientStoreId();
    } catch {
      return null;
    }
  })();

  if (!storeId) {
    return items;
  }

  const scoped = items.filter((item) => item.storeId === storeId);
  return scoped.length > 0 ? scoped : items;
}

export default function AdminPromotionsSection() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [form, setForm] = useState(initialForm);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<number, string[]>>({});
  const [productQuery, setProductQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [variantQuery, setVariantQuery] = useState("");
  const [optionQuery, setOptionQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<number | null>(null);
  const [actionPromotionId, setActionPromotionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [promoData, productData, categoryData, variantData, optionData] = await Promise.all([
          api("/discounts"),
          api("/products"),
          api("/categories"),
          api("/variants"),
          api("/product-options"),
        ]);

        setPromotions(Array.isArray(promoData) ? (promoData as AdminPromotion[]) : []);
        setProducts(
          Array.isArray(productData)
            ? (productData as Product[]).map((item) => ({
                id: item.id,
                title: item.title,
                slug: item.slug,
              }))
            : [],
        );
        setCategories(
          Array.isArray(categoryData)
            ? scopeCategoriesToActiveStore(categoryData as Category[])
            : [],
        );
    setVariants(Array.isArray(variantData) ? (variantData as Variant[]) : []);
    setOptions(Array.isArray(optionData) ? (optionData as ProductOption[]) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las promociones.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (form.scope !== "order" && !form.automatic) {
      setForm((current) => ({ ...current, automatic: true, couponCode: "", couponUsageLimit: "" }));
    }

    if (form.scope !== "order" && form.type === "free_shipping") {
      setForm((current) => ({ ...current, type: "percentage" }));
    }
  }, [form.scope, form.automatic, form.type]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (item) =>
        item.title.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query),
    );
  }, [products, productQuery]);

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query),
    );
  }, [categories, categoryQuery]);

  const filteredVariants = useMemo(() => {
    const query = variantQuery.trim().toLowerCase();
    if (!query) return variants;
    return variants.filter((item) => {
      const attributes = [item.Size, item.Color].filter(Boolean).join(" ").toLowerCase();
      return (
        item.sku.toLowerCase().includes(query) ||
        item.product.title.toLowerCase().includes(query) ||
        item.product.slug.toLowerCase().includes(query) ||
        attributes.includes(query)
      );
    });
  }, [variants, variantQuery]);

  const filteredOptions = useMemo(() => {
    const query = optionQuery.trim().toLowerCase();
    if (!query) return options;
    return options
      .map((option) => ({
        ...option,
        reusableValues: (option.reusableValues ?? []).filter((value) =>
          `${option.name} ${value.value}`.toLowerCase().includes(query),
        ),
      }))
      .filter(
        (option) =>
          option.name.toLowerCase().includes(query) ||
          (option.reusableValues?.length ?? 0) > 0,
      );
  }, [options, optionQuery]);

  const selectedTargetsSummary = useMemo(() => {
    if (form.scope === "product") {
      return selectedProductIds.length
        ? `${selectedProductIds.length} producto${selectedProductIds.length === 1 ? "" : "s"} seleccionado${selectedProductIds.length === 1 ? "" : "s"}`
        : "Elegí uno o más productos";
    }

    if (form.scope === "category") {
      return selectedCategoryIds.length
        ? `${selectedCategoryIds.length} colección${selectedCategoryIds.length === 1 ? "" : "es"} seleccionada${selectedCategoryIds.length === 1 ? "" : "s"}`
        : "Elegí una o más colecciones";
    }

    if (form.scope === "variant") {
      return selectedVariantIds.length
        ? `${selectedVariantIds.length} variante${selectedVariantIds.length === 1 ? "" : "s"} seleccionada${selectedVariantIds.length === 1 ? "" : "s"}`
        : "Elegí una o más variantes";
    }

    if (form.scope === "option") {
      return selectedOptionIds.length
        ? `${selectedOptionIds.length} etiqueta${selectedOptionIds.length === 1 ? "" : "s"} seleccionada${selectedOptionIds.length === 1 ? "" : "s"}`
        : "Elegí una o más etiquetas";
    }

    if (form.scope === "option_value") {
      const count = Object.values(selectedOptionValues).reduce((sum, values) => sum + values.length, 0);
      return count
        ? `${count} valor${count === 1 ? "" : "es"} de opción seleccionado${count === 1 ? "" : "s"}`
        : "Elegí atributos como Color = Negro o Talle = M";
    }

    return form.automatic
      ? "La promo se aplicará automáticamente en checkout."
      : "La promo se activará con cupón.";
  }, [form.scope, form.automatic, selectedCategoryIds.length, selectedProductIds.length, selectedVariantIds.length, selectedOptionIds.length, selectedOptionValues]);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = promotions.filter((promotion) => {
      const startsAt = promotion.startsAt ? new Date(promotion.startsAt).getTime() : null;
      const endsAt = promotion.endsAt ? new Date(promotion.endsAt).getTime() : null;
      return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
    }).length;

    return {
      active,
      automatic: promotions.filter((promotion) => promotion.automatic).length,
      coupon: promotions.filter((promotion) => !promotion.automatic).length,
    };
  }, [promotions]);

  const submit = async () => {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        scope: form.scope,
        type: form.type,
        automatic: form.scope === "order" ? form.automatic : true,
      };

      if (form.type !== "free_shipping") {
        payload.value = Number(form.value);
      }

      if (form.minimumAmount.trim()) {
        payload.minimumAmount = Number(form.minimumAmount);
      }

      if (form.startsAt) {
        payload.startsAt = toIsoDateTime(form.startsAt);
      }

      if (form.endsAt) {
        payload.endsAt = toIsoDateTime(form.endsAt);
      }

      if (form.scope === "order" && !form.automatic) {
        payload.couponCode = form.couponCode.trim().toUpperCase();
        if (form.couponUsageLimit.trim()) {
          payload.couponUsageLimit = Number(form.couponUsageLimit);
        }
      }

      if (form.scope === "product") {
        payload.productIds = selectedProductIds;
      }

      if (form.scope === "category") {
        payload.categoryIds = selectedCategoryIds;
      }

      if (form.scope === "variant") {
        payload.variantIds = selectedVariantIds;
      }

      if (form.scope === "option") {
        payload.optionIds = selectedOptionIds;
      }

      if (form.scope === "option_value") {
        payload.optionValueTargets = Object.entries(selectedOptionValues).flatMap(
          ([productOptionId, values]) =>
            values.map((value) => ({
              productOptionId: Number(productOptionId),
              value,
            })),
        );
      }

      await api(editingPromotionId ? `/discounts/${editingPromotionId}` : "/discounts", {
        method: editingPromotionId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      const freshPromotions = await api("/discounts");
      setPromotions(Array.isArray(freshPromotions) ? (freshPromotions as AdminPromotion[]) : []);
      resetForm();
      setSuccess(
        editingPromotionId
          ? "Promoción actualizada. Los cambios ya pueden reflejarse en catálogo, PDP y checkout."
          : "Promoción creada. Ya quedó lista para reflejarse en catálogo, PDP y checkout.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la promoción.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingPromotionId(null);
    setSelectedProductIds([]);
    setSelectedCategoryIds([]);
    setSelectedVariantIds([]);
    setSelectedOptionIds([]);
    setSelectedOptionValues({});
    setProductQuery("");
    setCategoryQuery("");
    setVariantQuery("");
    setOptionQuery("");
  };

  const startEditing = (promotion: AdminPromotion) => {
    setEditingPromotionId(promotion.id);
    setError("");
    setSuccess("");
    setForm({
      name: promotion.name,
      scope: promotion.scope,
      type: promotion.type,
      value:
        promotion.type === "free_shipping" ? "0" : String(Number(promotion.value ?? 0)),
      minimumAmount:
        promotion.minimumAmount === null || promotion.minimumAmount === undefined
          ? ""
          : String(Number(promotion.minimumAmount)),
      automatic: promotion.automatic,
      startsAt: promotion.startsAt ? toLocalDateTimeInput(promotion.startsAt) : "",
      endsAt: promotion.endsAt ? toLocalDateTimeInput(promotion.endsAt) : "",
      couponCode: promotion.coupons?.[0]?.code ?? "",
      couponUsageLimit:
        promotion.coupons?.[0]?.usageLimit === null ||
        promotion.coupons?.[0]?.usageLimit === undefined
          ? ""
          : String(promotion.coupons[0].usageLimit),
    });
    setSelectedProductIds((promotion.productTargets ?? []).map((target) => target.productId));
    setSelectedCategoryIds((promotion.categoryTargets ?? []).map((target) => target.categoryId));
    setSelectedVariantIds((promotion.variantTargets ?? []).map((target) => target.variantId));
    setSelectedOptionIds((promotion.optionTargets ?? []).map((target) => target.productOptionId));
    setSelectedOptionValues(
      (promotion.optionValueTargets ?? []).reduce<Record<number, string[]>>((acc, target) => {
        acc[target.productOptionId] = [...(acc[target.productOptionId] ?? []), target.value];
        return acc;
      }, {}),
    );
  };

  const cancelPromotion = async (promotionId: number) => {
    try {
      setActionPromotionId(promotionId);
      setError("");
      setSuccess("");
      await api(`/discounts/${promotionId}/cancel`, {
        method: "POST",
      });
      const freshPromotions = await api("/discounts");
      setPromotions(Array.isArray(freshPromotions) ? (freshPromotions as AdminPromotion[]) : []);
      if (editingPromotionId === promotionId) {
        resetForm();
      }
      setSuccess("Promoción cancelada. Quedó cerrada sin perder historial.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar la promoción.");
    } finally {
      setActionPromotionId(null);
    }
  };

  return (
    <section style={panelStyle}>
      <header style={headerBlockStyle}>
        <div>
          <p style={eyebrowStyle}>Promociones</p>
          <h2 style={titleStyle}>Ofertas entendibles, rápidas de crear y con targets reales</h2>
          <p style={copyStyle}>
            Definí si la promo vive sobre el pedido completo o sobre una parte precisa del catálogo.
            El resumen de abajo te deja validar antes de publicarla.
          </p>
        </div>
        <div style={statsGridStyle}>
          <Metric label="Activas" value={String(stats.active)} />
          <Metric label="Automáticas" value={String(stats.automatic)} />
          <Metric label="Con cupón" value={String(stats.coupon)} />
        </div>
      </header>

      <div style={workspaceStyle}>
        <section style={formPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>{editingPromotionId ? "Edición" : "Nueva promoción"}</p>
              <h3 style={sectionTitleStyle}>
                {editingPromotionId ? "Editar regla" : "Configurar regla"}
              </h3>
            </div>
            <button type="button" onClick={resetForm} style={ghostButtonStyle}>
              {editingPromotionId ? "Salir de edición" : "Limpiar"}
            </button>
          </div>

          <div style={gridTwoStyle}>
            <Field label="Nombre de la promoción">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ej. Remeras Mid Season"
                style={fieldStyle}
              />
            </Field>

            <Field label="Tipo de descuento">
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as DiscountType,
                  }))
                }
                style={fieldStyle}
              >
                <option value="percentage">Porcentaje</option>
                <option value="fixed_amount">Monto fijo</option>
                {form.scope === "order" ? <option value="free_shipping">Envío gratis</option> : null}
              </select>
            </Field>
          </div>

          <div style={scopeGridStyle}>
            {scopeOptions.map((scope) => {
              const active = form.scope === scope.id;
              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, scope: scope.id }))}
                  style={scopeCardStyle(active)}
                >
                  <strong style={{ fontSize: 15 }}>{scope.label}</strong>
                  <span style={scopeDescriptionStyle}>{scope.description}</span>
                </button>
              );
            })}
          </div>

          <div style={gridThreeStyle}>
            {form.type !== "free_shipping" ? (
              <Field label={form.type === "percentage" ? "Valor (%)" : "Valor fijo"}>
                <input
                  value={form.value}
                  onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                  placeholder={form.type === "percentage" ? "30" : "15000"}
                  style={fieldStyle}
                />
              </Field>
            ) : (
              <Field label="Valor">
                <div style={readOnlyFieldStyle}>La promo pondrá el envío en 0 automáticamente.</div>
              </Field>
            )}

            <Field label="Mínimo de compra">
              <input
                value={form.minimumAmount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, minimumAmount: event.target.value }))
                }
                placeholder="Opcional"
                style={fieldStyle}
              />
            </Field>

            {false ? <Field label="Modo">
              <div style={toggleRowStyle}>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, automatic: true }))}
                  disabled={form.scope !== "order"}
                  style={toggleButtonStyle(form.automatic)}
                >
                  Automática
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, automatic: false }))}
                  disabled={form.scope !== "order"}
                  style={toggleButtonStyle(!form.automatic)}
                >
                  Cupón
                </button>
              </div>
            </Field> : (
              <Field label="Modo">
                <select
                  value={form.automatic ? "automatic" : "coupon"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      automatic: event.target.value === "automatic",
                    }))
                  }
                  disabled={form.scope !== "order"}
                  style={fieldStyle}
                >
                  <option value="automatic">Automática</option>
                  <option value="coupon">Cupón</option>
                </select>
              </Field>
            )}
          </div>

          <div style={gridTwoStyle}>
            <Field label="Inicio">
              <DateTimeField
                value={form.startsAt}
                onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))}
              />
            </Field>
            <Field label="Fin">
              <DateTimeField
                value={form.endsAt}
                onChange={(value) => setForm((current) => ({ ...current, endsAt: value }))}
              />
            </Field>
          </div>

          {form.scope === "order" && !form.automatic ? (
            <div style={gridTwoStyle}>
              <Field label="Código">
                <input
                  value={form.couponCode}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, couponCode: event.target.value.toUpperCase() }))
                  }
                  placeholder="BIENVENIDA10"
                  style={fieldStyle}
                />
              </Field>
              <Field label="Límite de usos">
                <input
                  value={form.couponUsageLimit}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, couponUsageLimit: event.target.value }))
                  }
                  placeholder="Opcional"
                  style={fieldStyle}
                />
              </Field>
            </div>
          ) : null}

          <div style={targetPanelStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Targets</p>
                <h3 style={sectionTitleStyle}>Dónde se aplica</h3>
              </div>
              <span style={metaBadgeStyle}>{selectedTargetsSummary}</span>
            </div>

            {form.scope === "order" ? (
              <div style={emptyTargetStyle}>
                Esta promo trabaja sobre el pedido completo, así que no necesita targets puntuales.
              </div>
            ) : null}

            {form.scope === "category" ? (
              <>
                <input
                  value={categoryQuery}
                  onChange={(event) => setCategoryQuery(event.target.value)}
                  placeholder="Buscar colección"
                  style={fieldStyle}
                />
                <div style={selectionGridStyle}>
                  {filteredCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryIds((current) => toggleId(current, category.id))}
                      style={selectionCardStyle(selectedCategoryIds.includes(category.id))}
                    >
                      <strong>{category.name}</strong>
                      <span style={selectionMetaStyle}>/{category.slug}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {form.scope === "product" ? (
              <>
                <input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Buscar producto"
                  style={fieldStyle}
                />
                <div style={selectionGridStyle}>
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProductIds((current) => toggleId(current, product.id))}
                      style={selectionCardStyle(selectedProductIds.includes(product.id))}
                    >
                      <strong>{product.title}</strong>
                      <span style={selectionMetaStyle}>/{product.slug}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {form.scope === "variant" ? (
              <>
                <input
                  value={variantQuery}
                  onChange={(event) => setVariantQuery(event.target.value)}
                  placeholder="Buscar SKU, producto, talle o color"
                  style={fieldStyle}
                />
                <div style={selectionGridStyle}>
                  {filteredVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantIds((current) => toggleId(current, variant.id))}
                      style={selectionCardStyle(selectedVariantIds.includes(variant.id))}
                    >
                      <strong>{variant.product.title}</strong>
                      <span style={selectionMetaStyle}>{variant.sku}</span>
                      <span style={selectionMetaStyle}>
                        {[variant.Size, variant.Color].filter(Boolean).join(" / ") || "Base"}
                      </span>
                      <span style={selectionMetaStyle}>{money(Number(variant.price ?? 0))}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {form.scope === "option" ? (
              <>
                <input
                  value={optionQuery}
                  onChange={(event) => setOptionQuery(event.target.value)}
                  placeholder="Buscar etiqueta"
                  style={fieldStyle}
                />
                <div style={selectionGridStyle}>
                  {filteredOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOptionIds((current) => toggleId(current, option.id))}
                      style={selectionCardStyle(selectedOptionIds.includes(option.id))}
                    >
                      <strong>{option.name}</strong>
                      <span style={selectionMetaStyle}>
                        {(option.reusableValues ?? []).length} valor{(option.reusableValues ?? []).length === 1 ? "" : "es"}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {form.scope === "option_value" ? (
              <>
                <input
                  value={optionQuery}
                  onChange={(event) => setOptionQuery(event.target.value)}
                  placeholder="Buscar atributo o valor"
                  style={fieldStyle}
                />
                <div style={optionGridStyle}>
                  {filteredOptions.map((option) => (
                    <article key={option.id} style={optionCardStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <strong>{option.name}</strong>
                        <span style={selectionMetaStyle}>
                          {(option.reusableValues ?? []).length} valor{(option.reusableValues ?? []).length === 1 ? "" : "es"} reutilizable{(option.reusableValues ?? []).length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div style={chipWrapStyle}>
                        {(option.reusableValues ?? []).map((value) => {
                          const active = (selectedOptionValues[option.id] ?? []).includes(value.value);
                          return (
                            <button
                              key={`${option.id}-${value.value}`}
                              type="button"
                              onClick={() =>
                                setSelectedOptionValues((current) => ({
                                  ...current,
                                  [option.id]: toggleString(current[option.id] ?? [], value.value),
                                }))
                              }
                              style={chipStyle(active)}
                            >
                              {value.value}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div style={summaryCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>Resumen</p>
                <h3 style={sectionTitleStyle}>Qué va a pasar cuando la actives</h3>
              </div>
            </div>
            <div style={summaryGridStyle}>
              <SummaryItem
                label="Regla"
                value={
                  form.type === "percentage"
                    ? `${form.value || 0}% off`
                    : form.type === "fixed_amount"
                      ? `${money(Number(form.value || 0))} off`
                      : "Envío gratis"
                }
              />
              <SummaryItem label="Alcance" value={scopeOptions.find((scope) => scope.id === form.scope)?.label ?? form.scope} />
              <SummaryItem label="Modo" value={form.scope === "order" ? (form.automatic ? "Automática" : `Cupón ${form.couponCode || "sin código"}`) : "Automática por target"} />
              <SummaryItem label="Targets" value={selectedTargetsSummary} />
            </div>
          </div>

          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}

          <div style={footerStyle}>
            <button type="button" onClick={submit} disabled={saving || !canSubmit(form, selectedProductIds, selectedCategoryIds, selectedVariantIds, selectedOptionIds, selectedOptionValues)} style={primaryButtonStyle}>
              {saving ? "Guardando..." : editingPromotionId ? "Guardar cambios" : "Crear promoción"}
            </button>
          </div>
        </section>

        <section style={listPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>Promos existentes</p>
              <h3 style={sectionTitleStyle}>Listado operativo</h3>
            </div>
          </div>

          {loading ? (
            <div style={emptyTargetStyle}>Cargando promociones...</div>
          ) : promotions.length === 0 ? (
            <div style={emptyTargetStyle}>Todavía no hay promociones creadas en esta tienda.</div>
          ) : (
            <div style={promotionListStyle}>
              {promotions.map((promotion) => (
                <article key={promotion.id} style={promotionCardStyle}>
                  <div style={promotionHeaderStyle}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 18 }}>{promotion.name}</h4>
                      <p style={cardMetaStyle}>
                        {labelScope(promotion.scope)} · {labelType(promotion)} · {promotion.automatic ? "Automática" : `Cupón ${promotion.coupons?.[0]?.code ?? ""}`}
                      </p>
                    </div>
                    <span style={statusPillStyle(promotion)}>{promotionStatus(promotion)}</span>
                  </div>
                  <div style={summaryGridStyle}>
                    <SummaryItem label="Targets" value={promotionTargetsSummary(promotion)} />
                    <SummaryItem label="Mínimo" value={promotion.minimumAmount ? money(Number(promotion.minimumAmount)) : "Sin mínimo"} />
                    <SummaryItem label="Vigencia" value={promotionWindowLabel(promotion)} />
                    <SummaryItem label="Uso cupón" value={promotion.automatic ? "No aplica" : couponUsageLabel(promotion)} />
                  </div>
                  <div style={promotionActionsStyle}>
                    <button type="button" onClick={() => startEditing(promotion)} style={ghostButtonStyle}>
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancelPromotion(promotion.id)}
                      disabled={actionPromotionId === promotion.id || promotionStatus(promotion) === "Vencida"}
                      style={dangerButtonStyle}
                    >
                      {actionPromotionId === promotion.id ? "Cancelando..." : "Cancelar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 10 }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function DateTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });

    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  };

  return (
    <div style={dateTimeFieldWrapStyle}>
      <input
        ref={inputRef}
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onMouseDown={(event) => {
          event.preventDefault();
          openPicker();
        }}
        style={dateTimeFieldInputStyle}
      />
      <button
        type="button"
        aria-label="Abrir selector de fecha y hora"
        onMouseDown={(event) => {
          event.preventDefault();
          openPicker();
        }}
        onClick={(event) => event.preventDefault()}
        style={dateTimeFieldButtonStyle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 8h3v3H8v-3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={metricValueStyle}>{value}</strong>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryItemStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={{ fontSize: 14 }}>{value}</strong>
    </div>
  );
}

function labelScope(scope: AdminPromotion["scope"]) {
  return scopeOptions.find((option) => option.id === scope)?.label ?? scope;
}

function labelType(promotion: AdminPromotion) {
  if (promotion.type === "percentage") {
    return `${promotion.value ?? 0}% off`;
  }

  if (promotion.type === "fixed_amount") {
    return `${money(Number(promotion.value ?? 0))} off`;
  }

  return "Envío gratis";
}

function promotionStatus(promotion: AdminPromotion) {
  const now = Date.now();
  const startsAt = promotion.startsAt ? new Date(promotion.startsAt).getTime() : null;
  const endsAt = promotion.endsAt ? new Date(promotion.endsAt).getTime() : null;

  if (startsAt && startsAt > now) {
    return "Programada";
  }

  if (endsAt && endsAt < now) {
    return "Vencida";
  }

  return "Activa";
}

function promotionWindowLabel(promotion: AdminPromotion) {
  const start = promotion.startsAt ? formatDateTime(promotion.startsAt) : "Desde ahora";
  const end = promotion.endsAt ? formatDateTime(promotion.endsAt) : "sin fin";
  return `${start} → ${end}`;
}

function couponUsageLabel(promotion: AdminPromotion) {
  const coupon = promotion.coupons?.[0];
  if (!coupon) {
    return "Sin cupón";
  }

  if (!coupon.usageLimit) {
    return `${coupon.usedCount} usos`;
  }

  return `${coupon.usedCount}/${coupon.usageLimit}`;
}

function promotionTargetsSummary(promotion: AdminPromotion) {
  if (promotion.scope === "order") {
    return "Pedido completo";
  }

  if (promotion.scope === "category") {
    return (promotion.categoryTargets ?? []).map((target) => target.category.name).join(", ") || "Sin targets";
  }

  if (promotion.scope === "product") {
    return (promotion.productTargets ?? []).map((target) => target.product.title).join(", ") || "Sin targets";
  }

  if (promotion.scope === "variant") {
    return (promotion.variantTargets ?? [])
      .map((target) => {
        const detail = [target.variant.sku, target.variant.Size, target.variant.Color].filter(Boolean).join(" / ");
        return `${target.variant.product.title}${detail ? ` · ${detail}` : ""}`;
      })
      .join(", ") || "Sin targets";
  }

  if (promotion.scope === "option") {
    return (promotion.optionTargets ?? [])
      .map((target) => target.productOption.name)
      .join(", ") || "Sin targets";
  }

  return (promotion.optionValueTargets ?? [])
    .map((target) => `${target.productOption.name}: ${target.value}`)
    .join(", ") || "Sin targets";
}

function canSubmit(
  form: typeof initialForm,
  productIds: number[],
  categoryIds: number[],
  variantIds: number[],
  optionIds: number[],
  optionValues: Record<number, string[]>,
) {
  if (!form.name.trim()) return false;
  if (
    form.type !== "free_shipping" &&
    (!form.value.trim() || !Number.isFinite(Number(form.value)))
  ) {
    return false;
  }
  if (form.scope === "order" && !form.automatic && !form.couponCode.trim()) return false;
  if (form.scope === "product" && productIds.length === 0) return false;
  if (form.scope === "category" && categoryIds.length === 0) return false;
  if (form.scope === "variant" && variantIds.length === 0) return false;
  if (form.scope === "option" && optionIds.length === 0) return false;
  if (
    form.scope === "option_value" &&
    Object.values(optionValues).every((values) => values.length === 0)
  ) {
    return false;
  }

  return true;
}

function toggleId(current: number[], value: number) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function toggleString(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 24 };
const workspaceStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)",
  gap: 24,
  alignItems: "start",
};
const headerBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};
const titleStyle: React.CSSProperties = { margin: "8px 0 0", fontSize: "clamp(1.8rem, 2.8vw, 2.5rem)", lineHeight: 1.02 };
const copyStyle: React.CSSProperties = { margin: "10px 0 0", color: "var(--account-text-muted)", lineHeight: 1.7, maxWidth: 860 };
const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
};
const sectionTitleStyle: React.CSSProperties = { margin: "6px 0 0", fontSize: 24 };
const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "var(--account-text-soft)",
};
const formPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
  padding: 28,
  borderRadius: 32,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
};
const listPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  padding: 28,
  borderRadius: 32,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  position: "sticky",
  top: 24,
};
const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 14,
};
const metricCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 22,
  border: "1px solid var(--checkout-border)",
  background:
    "color-mix(in srgb, var(--page-panel-bg) 78%, var(--page-panel-strong-bg, #111) 22%)",
  display: "grid",
  gap: 8,
};
const metricLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "var(--account-text-soft)",
};
const metricValueStyle: React.CSSProperties = { fontSize: 28, color: "var(--account-text-strong)" };
const gridTwoStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 };
const gridThreeStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 };
const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  outline: "none",
};
const dateTimeFieldWrapStyle: React.CSSProperties = {
  ...fieldStyle,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  overflow: "hidden",
};
const dateTimeFieldInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "14px 16px",
  border: "none",
  background: "transparent",
  color: "var(--account-text-strong)",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
};
const dateTimeFieldButtonStyle: React.CSSProperties = {
  width: 44,
  height: "100%",
  minHeight: 52,
  border: "none",
  borderLeft: "1px solid var(--checkout-border)",
  background: "transparent",
  color: "var(--account-text-muted)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};
const readOnlyFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  display: "flex",
  alignItems: "center",
  minHeight: 52,
  color: "var(--account-text-muted)",
};
const fieldLabelStyle: React.CSSProperties = { fontSize: 12, color: "var(--account-text-muted)" };
const scopeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const scopeCardStyle = (active: boolean): React.CSSProperties => ({
  borderRadius: 22,
  padding: 16,
  border: active ? "1px solid var(--account-item-border-active)" : "1px solid var(--account-item-border)",
  background: active ? "var(--admin-chip-selected-bg)" : "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  boxShadow: active ? "var(--admin-chip-selected-shadow)" : "none",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 8,
});
const scopeDescriptionStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--account-text-muted)",
};
const toggleRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 14,
  border: active ? "1px solid var(--account-item-border-active)" : "1px solid var(--account-item-border)",
  background: active ? "var(--admin-chip-selected-bg)" : "var(--account-item-bg)",
  color: active ? "var(--account-text-strong)" : "var(--account-text-muted)",
  boxShadow: active ? "var(--admin-chip-selected-shadow)" : "none",
  cursor: "pointer",
});
const targetPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 20,
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "color-mix(in srgb, white 88%, var(--theme-colors-paper-muted) 12%)",
};
const metaBadgeStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "var(--account-item-bg)",
  border: "1px solid var(--account-item-border)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};
const emptyTargetStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: "1px dashed var(--account-item-border-active)",
  color: "var(--account-text-soft)",
  background: "color-mix(in srgb, white 86%, var(--theme-colors-paper-muted) 14%)",
};
const selectionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  maxHeight: 420,
  overflow: "auto",
  paddingRight: 6,
};
const selectionCardStyle = (active: boolean): React.CSSProperties => ({
  padding: 16,
  borderRadius: 18,
  border: active ? "1px solid var(--account-item-border-active)" : "1px solid var(--account-item-border)",
  background: active ? "var(--admin-chip-selected-bg)" : "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  boxShadow: active ? "var(--admin-chip-selected-shadow)" : "none",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 6,
});
const selectionMetaStyle: React.CSSProperties = { color: "var(--account-text-soft)", fontSize: 12 };
const optionGridStyle: React.CSSProperties = { display: "grid", gap: 12 };
const optionCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 18,
  borderRadius: 20,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const chipWrapStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 14px",
  borderRadius: 999,
  border: active ? "1px solid var(--account-item-border-active)" : "1px solid var(--account-item-border)",
  background: active ? "var(--admin-chip-selected-bg)" : "var(--account-item-bg)",
  color: active ? "var(--account-text-strong)" : "var(--account-text-muted)",
  boxShadow: active ? "var(--admin-chip-selected-shadow)" : "none",
  cursor: "pointer",
});
const summaryCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 20,
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const summaryItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 18,
  background: "color-mix(in srgb, white 82%, var(--theme-colors-paper-muted) 18%)",
  border: "1px solid var(--account-item-border)",
};
const footerStyle: React.CSSProperties = { display: "flex", justifyContent: "flex-end" };
const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderRadius: 16,
  border: "1px solid var(--account-item-border-active)",
  background: "var(--checkout-primary-bg)",
  color: "var(--checkout-primary-color)",
  cursor: "pointer",
  fontWeight: 600,
};
const ghostButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
};
const errorStyle: React.CSSProperties = { margin: 0, color: "#ffb3b3" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f7c6" };
const promotionListStyle: React.CSSProperties = { display: "grid", gap: 14 };
const promotionCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
  borderRadius: 22,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};
const promotionActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};
const promotionHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" };
const cardMetaStyle: React.CSSProperties = { margin: "6px 0 0", color: "var(--account-text-soft)", lineHeight: 1.5 };
const statusPillStyle = (promotion: AdminPromotion): React.CSSProperties => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--account-item-border)",
  background:
    promotionStatus(promotion) === "Activa"
      ? "var(--admin-tone-success-bg)"
      : promotionStatus(promotion) === "Programada"
        ? "var(--admin-tone-warning-bg)"
        : "var(--account-item-bg-active)",
  color:
    promotionStatus(promotion) === "Activa"
      ? "var(--admin-tone-success-color)"
      : promotionStatus(promotion) === "Programada"
        ? "var(--admin-tone-warning-color)"
        : "var(--account-text-strong)",
  fontSize: 12,
});
const dangerButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 16,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  cursor: "pointer",
};
