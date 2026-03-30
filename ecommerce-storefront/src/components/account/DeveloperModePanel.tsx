"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { getDefaultStorefrontConfig } from "@/lib/tenant/storefront-defaults";
import type { User } from "@/context/auth-context";
import type { Block } from "@/types/block";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Product = {
  id: number;
  title: string;
  slug: string;
};

type StorefrontConfig = {
  theme?: string;
  pages: {
    home: Block[];
  };
};

type AdminMercadoPagoConfig = {
  publicKey: string;
  accessToken: string;
  webhookSecret: string;
};

type MercadoPagoTestResult = {
  ok: boolean;
  message?: string;
  details?: string | null;
  checks?: {
    publicKey: boolean;
    accessToken: boolean;
    webhookSecret: boolean;
  };
  account?: {
    id?: number | string | null;
    nickname?: string | null;
    email?: string | null;
  } | null;
};

type FieldDefinition =
  | { key: string; label: string; type: "text" | "textarea" | "number" | "color" }
  | { key: string; label: string; type: "select"; options: Array<{ label: string; value: string }> }
  | { key: string; label: string; type: "products" | "image" };

const blockLabels: Record<string, string> = {
  hero: "Hero",
  hero_carousel: "Hero Carousel",
  product_grid: "Product Grid",
  carousel: "Carousel",
  category_grid: "Category Grid",
  featured_products: "Featured Products",
  newsletter: "Newsletter",
  banner: "Banner",
  testimonials: "Testimonials",
};

const animationOptions = [
  { label: "Entrada por defecto", value: "" },
  { label: "Suave", value: "soft" },
  { label: "Sin animacion", value: "none" },
];

const blockFieldMap: Record<string, FieldDefinition[]> = {
  hero: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "subtitle", label: "Subtitulo", type: "textarea" },
    { key: "buttonText", label: "Texto del boton", type: "text" },
    { key: "buttonLink", label: "Link del boton", type: "text" },
    { key: "image", label: "Imagen de fondo", type: "image" },
    { key: "backgroundColor", label: "Color de fondo", type: "color" },
    { key: "textColor", label: "Color de texto", type: "text" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  hero_carousel: [
    { key: "buttonText", label: "Texto del boton", type: "text" },
    { key: "buttonLink", label: "Link del boton", type: "text" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  product_grid: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "eyebrow", label: "Eyebrow", type: "text" },
    { key: "editorialLabel", label: "Label editorial", type: "text" },
    { key: "editorialTitle", label: "Titulo editorial", type: "text" },
    { key: "category", label: "Categoria (slug)", type: "select", options: [] },
    { key: "limit", label: "Limite", type: "number" },
    { key: "columns", label: "Columnas", type: "number" },
    { key: "productIds", label: "Productos curados", type: "products" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  carousel: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "limit", label: "Limite", type: "number" },
    { key: "productIds", label: "Productos curados", type: "products" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  featured_products: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "limit", label: "Limite", type: "number" },
    { key: "columns", label: "Columnas", type: "number" },
    { key: "productIds", label: "Productos curados", type: "products" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  category_grid: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "columns", label: "Columnas", type: "number" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  newsletter: [
    { key: "title", label: "Titulo", type: "text" },
    { key: "subtitle", label: "Subtitulo", type: "textarea" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  banner: [
    { key: "text", label: "Texto", type: "textarea" },
    { key: "image", label: "Imagen de fondo", type: "image" },
    { key: "backgroundColor", label: "Color de fondo", type: "color" },
    { key: "textColor", label: "Color de texto", type: "color" },
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
  testimonials: [
    { key: "animationPreset", label: "Animacion", type: "select", options: animationOptions },
  ],
};

function mergeStorefrontConfig(user: User, remoteConfig?: StorefrontConfig | null): StorefrontConfig | null {
  const fallback = user.storeId ? getDefaultStorefrontConfig(user.storeId) : null;

  if (!fallback && !remoteConfig) {
    return null;
  }

  return {
    theme: remoteConfig?.theme || fallback?.theme,
    pages: {
      home:
        Array.isArray(remoteConfig?.pages?.home) && remoteConfig.pages.home.length > 0
          ? remoteConfig.pages.home
          : fallback?.pages.home ?? [],
    },
  };
}

export default function DeveloperModePanel({
  user,
  forceExpanded = false,
}: {
  user: User;
  forceExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(forceExpanded);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [activeSection, setActiveSection] = useState<"blocks" | "integrations">("blocks");
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [mercadoPagoConfig, setMercadoPagoConfig] = useState<AdminMercadoPagoConfig>({
    publicKey: "",
    accessToken: "",
    webhookSecret: "",
  });
  const [mercadoPagoTestResult, setMercadoPagoTestResult] = useState<MercadoPagoTestResult | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [storefrontResponse, productsResponse, categoriesResponse, integrationsResponse] = await Promise.all([
          api("/store/admin/config"),
          api("/products"),
          api("/categories"),
          api("/store/admin/integrations"),
        ]);

        if (!active) {
          return;
        }

        setConfig(mergeStorefrontConfig(user, storefrontResponse?.storefrontConfig));
        setProducts(Array.isArray(productsResponse) ? productsResponse : []);
        setCategories(Array.isArray(categoriesResponse) ? categoriesResponse : []);
        setMercadoPagoConfig({
          publicKey: String(integrationsResponse?.mercadopago?.publicKey ?? ""),
          accessToken: String(integrationsResponse?.mercadopago?.accessToken ?? ""),
          webhookSecret: String(integrationsResponse?.mercadopago?.webhookSecret ?? ""),
        });
        setMercadoPagoTestResult(null);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "No se pudo cargar el modo desarrollador.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [expanded, user]);

  const blocks = config?.pages.home ?? [];
  const activeBlock = blocks[activeBlockIndex] ?? null;

  const categoryOptions = useMemo(
    () => [{ label: "Sin filtro de categoria", value: "" }].concat(
      categories.map((category) => ({
        label: `${category.name} (${category.slug})`,
        value: category.slug,
      })),
    ),
    [categories],
  );

  const updateBlockProps = (index: number, nextProps: Record<string, unknown>) => {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: {
          ...current.pages,
          home: current.pages.home.map((block, blockIndex) =>
            blockIndex === index
              ? {
                  ...block,
                  props: nextProps,
                }
              : block,
          ),
        },
      };
    });
  };

  const updateField = (fieldKey: string, value: unknown) => {
    if (!activeBlock) {
      return;
    }

    updateBlockProps(activeBlockIndex, {
      ...(activeBlock.props ?? {}),
      [fieldKey]: value,
    });
  };

  const toggleProduct = (productId: number) => {
    if (!activeBlock) {
      return;
    }

    const currentIds = Array.isArray(activeBlock.props?.productIds)
      ? (activeBlock.props?.productIds as unknown[])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [];

    const nextIds = currentIds.includes(productId)
      ? currentIds.filter((value) => value !== productId)
      : [...currentIds, productId];

    updateField("productIds", nextIds);
  };

  const updateSlide = (slideIndex: number, fieldKey: string, value: string) => {
    if (!activeBlock) {
      return;
    }

    const slides = Array.isArray(activeBlock.props?.slides)
      ? [...(activeBlock.props?.slides as Array<Record<string, unknown>>)]
      : [];
    const currentSlide = slides[slideIndex] ?? {};
    slides[slideIndex] = {
      ...currentSlide,
      [fieldKey]: value,
    };
    updateField("slides", slides);
  };

  const uploadAsset = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api("/store/admin/assets/upload", {
      method: "POST",
      body: formData,
    });
    const uploadedUrl = typeof response?.url === "string" ? response.url : "";

    if (!uploadedUrl) {
      throw new Error("No se recibio la URL del asset subido.");
    }

    return uploadedUrl;
  };

  const uploadFieldAsset = async (fieldKey: string, file?: File | null) => {
    if (!file) {
      return;
    }

    try {
      setUploadingKey(`field:${fieldKey}`);
      setError("");
      setSuccess("");
      const uploadedUrl = await uploadAsset(file);
      updateField(fieldKey, uploadedUrl);
      setSuccess("Imagen subida correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingKey(null);
    }
  };

  const uploadSlideAsset = async (slideIndex: number, file?: File | null) => {
    if (!file) {
      return;
    }

    try {
      setUploadingKey(`slide:${slideIndex}`);
      setError("");
      setSuccess("");
      const uploadedUrl = await uploadAsset(file);
      updateSlide(slideIndex, "image", uploadedUrl);
      setSuccess("Imagen del slide subida correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen del slide.");
    } finally {
      setUploadingKey(null);
    }
  };

  const addSlide = () => {
    if (!activeBlock) {
      return;
    }

    const slides = Array.isArray(activeBlock.props?.slides)
      ? [...(activeBlock.props?.slides as Array<Record<string, unknown>>)]
      : [];
    slides.push({
      image: "",
      eyebrow: "",
      title: "",
      subtitle: "",
    });
    updateField("slides", slides);
  };

  const removeSlide = (slideIndex: number) => {
    if (!activeBlock) {
      return;
    }

    const slides = Array.isArray(activeBlock.props?.slides)
      ? [...(activeBlock.props?.slides as Array<Record<string, unknown>>)]
      : [];
    updateField(
      "slides",
      slides.filter((_, index) => index !== slideIndex),
    );
  };

  const resetToDefaults = () => {
    const fallback = user.storeId ? getDefaultStorefrontConfig(user.storeId) : null;
    if (!fallback) {
      return;
    }

    setConfig({
      theme: fallback.theme,
      pages: {
        home: fallback.pages.home,
      },
    });
    setActiveBlockIndex(0);
    setSuccess("");
    setError("");
  };

  const save = async () => {
    if (activeSection === "integrations") {
      try {
        setSaving(true);
        setError("");
        setSuccess("");
        setMercadoPagoTestResult(null);

        const response = await api("/store/admin/integrations/mercadopago", {
          method: "PUT",
          body: JSON.stringify(mercadoPagoConfig),
        });

        setMercadoPagoConfig({
          publicKey: String(response?.mercadopago?.publicKey ?? ""),
          accessToken: String(response?.mercadopago?.accessToken ?? ""),
          webhookSecret: String(response?.mercadopago?.webhookSecret ?? ""),
        });
        setSuccess("La configuracion de Mercado Pago se guardo correctamente.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la integracion.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!config) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api("/store/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          storefrontConfig: config,
        }),
      });

      setConfig(mergeStorefrontConfig(user, response?.storefrontConfig));
      setSuccess("La configuracion de bloques se guardo correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuracion.");
    } finally {
      setSaving(false);
    }
  };

  const testMercadoPago = async () => {
    try {
      setTestingIntegration(true);
      setError("");
      setSuccess("");
      setMercadoPagoTestResult(null);

      const response = await api("/store/admin/integrations/mercadopago/test", {
        method: "POST",
      });

      setMercadoPagoTestResult(response as MercadoPagoTestResult);
      if (response?.ok) {
        setSuccess(
          typeof response?.message === "string"
            ? response.message
            : "La integracion con Mercado Pago respondio correctamente.",
        );
      } else if (typeof response?.message === "string") {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar la integracion.");
    } finally {
      setTestingIntegration(false);
    }
  };

  return (
    <section style={cardStyle}>
      {!forceExpanded ? (
        <div style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Modo desarrollador</p>
            <h3 style={titleStyle}>Bloques de la tienda</h3>
            <p style={copyStyle}>
              Edita textos, fondos y productos destacados de cada bloque.
            </p>
          </div>
          <button type="button" onClick={() => setExpanded((current) => !current)} style={secondaryButtonStyle}>
            {expanded ? "Cerrar editor" : "Abrir editor"}
          </button>
        </div>
      ) : null}

      {!expanded ? null : (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={sectionTabsStyle}>
            <button
              type="button"
              onClick={() => setActiveSection("blocks")}
              style={sectionTabButtonStyle(activeSection === "blocks")}
            >
              Bloques
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("integrations")}
              style={sectionTabButtonStyle(activeSection === "integrations")}
            >
              Integraciones
            </button>
          </div>

          <div style={developerGridStyle}>
            {activeSection === "blocks" ? (
              <div style={menuCardStyle}>
                <strong style={{ fontSize: 16 }}>Bloques activos</strong>
                <div style={{ display: "grid", gap: 10 }}>
                  {blocks.map((block, index) => (
                    <button
                      key={`${block.type}-${index}`}
                      type="button"
                      onClick={() => setActiveBlockIndex(index)}
                      style={blockNavStyle(index === activeBlockIndex)}
                    >
                      <strong>{String(index + 1).padStart(2, "0")}</strong>
                      <span>{blockLabels[block.type] ?? block.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={menuCardStyle}>
                <strong style={{ fontSize: 16 }}>Integraciones</strong>
                <div style={{ display: "grid", gap: 10 }}>
                  <button type="button" style={blockNavStyle(true)}>
                    <strong>01</strong>
                    <span>Mercado Pago</span>
                  </button>
                </div>
              </div>
            )}

            <div style={editorCardStyle}>
              {loading ? (
                <p style={copyStyle}>
                  {activeSection === "blocks"
                    ? "Cargando configuracion de bloques..."
                    : "Cargando integraciones..."}
                </p>
              ) : activeSection === "integrations" ? (
                <>
                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={eyebrowStyle}>Integracion seleccionada</p>
                    <h4 style={{ margin: 0, fontSize: 24 }}>Mercado Pago</h4>
                    <p style={copyStyle}>
                      Carga las credenciales de esta tienda y valida que la cuenta responda antes de publicar.
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Public key</label>
                      <input
                        type="text"
                        value={mercadoPagoConfig.publicKey}
                        onChange={(event) => {
                          setMercadoPagoConfig((current) => ({
                            ...current,
                            publicKey: event.target.value,
                          }));
                          setMercadoPagoTestResult(null);
                        }}
                        placeholder="APP_USR-..."
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Access token</label>
                      <input
                        type="password"
                        value={mercadoPagoConfig.accessToken}
                        onChange={(event) => {
                          setMercadoPagoConfig((current) => ({
                            ...current,
                            accessToken: event.target.value,
                          }));
                          setMercadoPagoTestResult(null);
                        }}
                        placeholder="APP_USR-..."
                        autoComplete="new-password"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={labelStyle}>Webhook secret</label>
                      <input
                        type="password"
                        value={mercadoPagoConfig.webhookSecret}
                        onChange={(event) => {
                          setMercadoPagoConfig((current) => ({
                            ...current,
                            webhookSecret: event.target.value,
                          }));
                          setMercadoPagoTestResult(null);
                        }}
                        placeholder="Secret del webhook"
                        autoComplete="new-password"
                        style={inputStyle}
                      />
                    </div>

                    <div style={integrationInfoCardStyle}>
                      <strong style={{ fontSize: 15 }}>Chequeos rapidos</strong>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.publicKey))}>
                          <span>Public key</span>
                          <strong>{mercadoPagoConfig.publicKey ? "Cargada" : "Pendiente"}</strong>
                        </div>
                        <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.accessToken))}>
                          <span>Access token</span>
                          <strong>{mercadoPagoConfig.accessToken ? "Cargado" : "Pendiente"}</strong>
                        </div>
                        <div style={integrationCheckStyle(Boolean(mercadoPagoConfig.webhookSecret))}>
                          <span>Webhook secret</span>
                          <strong>{mercadoPagoConfig.webhookSecret ? "Cargado" : "Pendiente"}</strong>
                        </div>
                      </div>
                    </div>

                    {mercadoPagoTestResult ? (
                      <div
                        style={{
                          ...integrationInfoCardStyle,
                          border: mercadoPagoTestResult.ok
                            ? "1px solid var(--admin-tone-success-border)"
                            : "1px solid var(--admin-danger-border)",
                        }}
                      >
                        <strong style={{ fontSize: 15 }}>
                          {mercadoPagoTestResult.ok ? "Test exitoso" : "Test con observaciones"}
                        </strong>
                        {mercadoPagoTestResult.account ? (
                          <p style={hintStyle}>
                            Cuenta: {mercadoPagoTestResult.account.nickname || "Sin alias"}
                            {mercadoPagoTestResult.account.email
                              ? ` · ${mercadoPagoTestResult.account.email}`
                              : ""}
                          </p>
                        ) : null}
                        {mercadoPagoTestResult.details ? (
                          <p style={hintStyle}>{mercadoPagoTestResult.details}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : !activeBlock ? (
                <p style={copyStyle}>No encontramos bloques para esta tienda.</p>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={eyebrowStyle}>Bloque seleccionado</p>
                    <h4 style={{ margin: 0, fontSize: 24 }}>
                      {blockLabels[activeBlock.type] ?? activeBlock.type}
                    </h4>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {(blockFieldMap[activeBlock.type] ?? []).map((field) => {
                      if (field.type === "products") {
                        const selectedProductIds = Array.isArray(activeBlock.props?.productIds)
                          ? (activeBlock.props?.productIds as unknown[])
                              .map((value) => Number(value))
                              .filter((value) => Number.isInteger(value) && value > 0)
                          : [];

                        return (
                          <div key={field.key} style={{ display: "grid", gap: 10 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <p style={hintStyle}>
                              Si eliges productos manualmente, esa seleccion prevalece sobre la categoria.
                            </p>
                            <div style={productPickerStyle}>
                              {products.map((product) => {
                                const checked = selectedProductIds.includes(product.id);
                                return (
                                  <label key={product.id} style={productChipStyle(checked)}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleProduct(product.id)}
                                    />
                                    <span>{product.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      if (field.type === "image") {
                        const imageUrl = String(activeBlock.props?.[field.key] ?? "");

                        return (
                          <div key={field.key} style={{ display: "grid", gap: 10 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <div style={assetActionsStyle}>
                              <label style={uploadButtonStyle}>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  style={{ display: "none" }}
                                  onChange={(event) => {
                                    void uploadFieldAsset(field.key, event.target.files?.[0] ?? null);
                                    event.currentTarget.value = "";
                                  }}
                                />
                                {uploadingKey === `field:${field.key}` ? "Subiendo..." : "Subir imagen"}
                              </label>
                              {imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => updateField(field.key, "")}
                                  style={dangerButtonStyle}
                                >
                                  Quitar imagen
                                </button>
                              ) : null}
                            </div>
                            {imageUrl ? (
                              <div style={assetPreviewCardStyle}>
                                <Image
                                  src={resolveAssetUrl(imageUrl) ?? imageUrl}
                                  alt={field.label}
                                  width={1200}
                                  height={720}
                                  unoptimized
                                  style={assetPreviewImageStyle}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      }

                      const categoryAwareField =
                        field.key === "category"
                          ? { ...field, options: categoryOptions }
                          : field;
                      const rawValue = activeBlock.props?.[field.key];
                      const value =
                        categoryAwareField.type === "number"
                          ? Number(rawValue ?? 0)
                          : String(rawValue ?? "");

                      if (categoryAwareField.type === "textarea") {
                        return (
                          <div key={field.key} style={{ display: "grid", gap: 8 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <textarea
                              value={value}
                              onChange={(event) => updateField(field.key, event.target.value)}
                              style={textareaStyle}
                              rows={4}
                            />
                          </div>
                        );
                      }

                      if (categoryAwareField.type === "select") {
                        return (
                          <div key={field.key} style={{ display: "grid", gap: 8 }}>
                            <label style={labelStyle}>{field.label}</label>
                            <select
                              value={value}
                              onChange={(event) => updateField(field.key, event.target.value)}
                              style={inputStyle}
                            >
                              {categoryAwareField.options.map((option) => (
                                <option key={option.value || "empty"} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} style={{ display: "grid", gap: 8 }}>
                          <label style={labelStyle}>{field.label}</label>
                          <input
                            type={categoryAwareField.type === "number" ? "number" : categoryAwareField.type === "color" ? "color" : "text"}
                            value={value}
                            onChange={(event) =>
                              updateField(
                                field.key,
                                categoryAwareField.type === "number"
                                  ? Number(event.target.value || 0)
                                  : event.target.value,
                              )
                            }
                            style={categoryAwareField.type === "color" ? colorInputStyle : inputStyle}
                          />
                        </div>
                      );
                    })}

                    {activeBlock.type === "hero_carousel" ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <label style={labelStyle}>Slides del hero</label>
                          <button type="button" onClick={addSlide} style={secondaryButtonStyle}>
                            Agregar slide
                          </button>
                        </div>
                        <div style={{ display: "grid", gap: 12 }}>
                          {(Array.isArray(activeBlock.props?.slides) ? activeBlock.props.slides : []).map((slide, slideIndex) => {
                            const safeSlide =
                              slide && typeof slide === "object"
                                ? (slide as Record<string, unknown>)
                                : {};

                            return (
                              <div key={slideIndex} style={slideCardStyle}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                  <strong>Slide {slideIndex + 1}</strong>
                                  <button type="button" onClick={() => removeSlide(slideIndex)} style={dangerButtonStyle}>
                                    Quitar
                                  </button>
                                </div>
                                <div style={assetActionsStyle}>
                                  <label style={uploadButtonStyle}>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      style={{ display: "none" }}
                                      onChange={(event) => {
                                        void uploadSlideAsset(slideIndex, event.target.files?.[0] ?? null);
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    {uploadingKey === `slide:${slideIndex}` ? "Subiendo..." : "Subir imagen"}
                                  </label>
                                  {String(safeSlide.image ?? "") ? (
                                    <button
                                      type="button"
                                      onClick={() => updateSlide(slideIndex, "image", "")}
                                      style={dangerButtonStyle}
                                    >
                                      Quitar imagen
                                    </button>
                                  ) : null}
                                </div>
                                {String(safeSlide.image ?? "") ? (
                                  <div style={assetPreviewCardStyle}>
                                    <Image
                                      src={resolveAssetUrl(String(safeSlide.image ?? "")) ?? String(safeSlide.image ?? "")}
                                      alt={`Slide ${slideIndex + 1}`}
                                      width={1200}
                                      height={720}
                                      unoptimized
                                      style={assetPreviewImageStyle}
                                    />
                                  </div>
                                ) : null}
                                <input
                                  value={String(safeSlide.eyebrow ?? "")}
                                  onChange={(event) => updateSlide(slideIndex, "eyebrow", event.target.value)}
                                  placeholder="Eyebrow"
                                  style={inputStyle}
                                />
                                <input
                                  value={String(safeSlide.title ?? "")}
                                  onChange={(event) => updateSlide(slideIndex, "title", event.target.value)}
                                  placeholder="Titulo"
                                  style={inputStyle}
                                />
                                <textarea
                                  value={String(safeSlide.subtitle ?? "")}
                                  onChange={(event) => updateSlide(slideIndex, "subtitle", event.target.value)}
                                  placeholder="Subtitulo"
                                  style={textareaStyle}
                                  rows={3}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading || (activeSection === "blocks" && !config)}
              style={primaryButtonStyle}
            >
              {saving
                ? "Guardando..."
                : activeSection === "integrations"
                  ? "Guardar integracion"
                  : "Guardar bloques"}
            </button>
            {activeSection === "integrations" ? (
              <button
                type="button"
                onClick={testMercadoPago}
                disabled={saving || loading || testingIntegration}
                style={secondaryButtonStyle}
              >
                {testingIntegration ? "Probando..." : "Probar integracion"}
              </button>
            ) : (
              <button type="button" onClick={resetToDefaults} disabled={saving || loading} style={secondaryButtonStyle}>
                Restaurar defaults
              </button>
            )}
          </div>

          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </div>
      )}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 32,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
  display: "grid",
  gap: 20,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const developerGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 0.34fr) minmax(0, 1fr)",
  gap: 18,
  alignItems: "start",
};

const sectionTabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const menuCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 18,
  display: "grid",
  gap: 14,
};

const editorCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 20,
  display: "grid",
  gap: 18,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 24,
};

const copyStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
};

const labelStyle: React.CSSProperties = {
  color: "var(--account-text-strong)",
  fontSize: 14,
};

const hintStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-soft)",
  fontSize: 13,
  lineHeight: 1.6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 104,
};

const colorInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: 6,
  minHeight: 52,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--checkout-primary-bg)",
  color: "var(--checkout-primary-color)",
  border: "1px solid var(--account-item-border-active)",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border)",
  borderRadius: 999,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  border: "1px solid var(--admin-danger-border)",
  borderRadius: 999,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--admin-danger-color)",
};

const successStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--admin-tone-success-color)",
};

const productPickerStyle: React.CSSProperties = {
  maxHeight: 260,
  overflowY: "auto",
  display: "grid",
  gap: 8,
};

const slideCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 10,
};

const assetActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const uploadButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border)",
  borderRadius: 999,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
};

const assetPreviewCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 0,
  padding: 14,
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
};

const assetPreviewImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 220,
  objectFit: "cover",
  borderRadius: 14,
  border: "1px solid var(--account-item-border)",
};

const integrationInfoCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 10,
};

function sectionTabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 999,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    color: "var(--account-text-strong)",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function blockNavStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 18,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    padding: "12px 14px",
    color: "var(--account-text-strong)",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    textAlign: "left",
  };
}

function integrationCheckStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 16,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    color: "var(--account-text-strong)",
  };
}

function productChipStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 16,
    border: active
      ? "1px solid var(--account-item-border-active)"
      : "1px solid var(--account-item-border)",
    background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
    color: "var(--account-text-strong)",
  };
}
