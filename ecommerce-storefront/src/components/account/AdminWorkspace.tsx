"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { money, orderStatusLabel, type CustomerOrder } from "./order-utils";
import AdminOrderDetailPanel from "./AdminOrderDetailPanel";

type AdminSection =
  | "admin-overview"
  | "admin-products"
  | "admin-categories"
  | "admin-orders"
  | "admin-customers";

type Props = { section: AdminSection };

type Product = {
  id: number;
  title: string;
  slug: string;
  published: boolean;
  description?: string | null;
  images?: Array<{ id: number; url: string }>;
  variants?: Array<{ id: number }>;
  categories?: Array<{ category: { id: number; name: string } }>;
};

type Category = { id: number; name: string; slug: string };
type Customer = {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};
type ProductOption = {
  id: number;
  name: string;
  reusableValues?: Array<{ id: number; value: string }>;
};
type DraftVariant = {
  sku: string;
  price: string;
  Size: string;
  Color: string;
  inventoryQuantity: string;
  weight: string;
  width: string;
  height: string;
  length: string;
};

type UploadImage = {
  file: File;
  name: string;
};

type EditableVariant = DraftVariant & {
  id?: number;
};

type ProductOptionValueEntry = {
  id: number;
  productOptionId: number;
  value: string;
};

const statuses = ["pending", "paid", "processing", "packed", "shipped", "delivered", "cancelled"] as const;

const emptyVariant = (): DraftVariant => ({
  sku: "",
  price: "",
  Size: "",
  Color: "",
  inventoryQuantity: "",
  weight: "",
  width: "",
  height: "",
  length: "",
});

export default function AdminWorkspace({ section }: Props) {
  if (section === "admin-products") return <AdminProductsSection />;
  if (section === "admin-categories") return <AdminCategoriesSection />;
  if (section === "admin-orders") return <AdminOrdersPanelSection />;
  if (section === "admin-customers") return <AdminCustomersSection />;
  return <AdminOverviewSection />;
}

function AdminOverviewSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c, o, u] = await Promise.all([
          api("/products"),
          api("/categories"),
          api("/orders"),
          api("/customers"),
        ]);
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
        setOrders(Array.isArray(o) ? o : []);
        setCustomers(Array.isArray(u) ? u : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section style={panelStyle}>
      <Header
        title="Panel general"
        copy="La administracion queda arriba de la cuenta y la barra lateral pasa a ser mas angosta para darle prioridad al area de trabajo."
      />
      {loading ? <StateCard label="Cargando resumen..." /> : (
        <div style={statsGridStyle}>
          <Stat label="Productos" value={String(products.length)} />
          <Stat label="Categorias" value={String(categories.length)} />
          <Stat label="Clientes" value={String(customers.length)} />
          <Stat label="Pedidos pendientes" value={String(orders.filter((item) => item.status === "pending").length)} />
          <Stat label="Facturacion" value={money(orders.reduce((sum, item) => sum + Number(item.total ?? 0), 0))} />
        </div>
      )}
    </section>
  );
}

function AdminProductsSection() {
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [creatingOption, setCreatingOption] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newOptionName, setNewOptionName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [form, setForm] = useState({ title: "", description: "", published: false });
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [imageFiles, setImageFiles] = useState<UploadImage[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: number; url: string }>>([]);
  const [originalImageIds, setOriginalImageIds] = useState<number[]>([]);
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<number, string[]>>({});
  const [loadedOptionValues, setLoadedOptionValues] = useState<ProductOptionValueEntry[]>([]);
  const [draftOptionValues, setDraftOptionValues] = useState<Record<number, string>>({});
  const [variantDraft, setVariantDraft] = useState<EditableVariant>(emptyVariant());
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const [loadedVariants, setLoadedVariants] = useState<EditableVariant[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, c, o] = await Promise.all([
        api("/products"),
        api("/categories"),
        api("/product-options"),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
      setOptions(Array.isArray(o) ? o : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const categoryText = (product.categories ?? [])
        .map((entry) => entry.category.name)
        .join(" ")
        .toLowerCase();

      return (
        product.title.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        categoryText.includes(query)
      );
    });
  }, [productQuery, products]);

  const resetForm = () => {
    setEditingProductId(null);
    setForm({ title: "", description: "", published: false });
    setSelectedCategoryIds([]);
    setImageFiles([]);
    setExistingImages([]);
    setOriginalImageIds([]);
    setSelectedOptionValues({});
    setLoadedOptionValues([]);
    setDraftOptionValues({});
    setVariantDraft(emptyVariant());
    setVariants([]);
    setLoadedVariants([]);
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    );
  };

  const toggleOptionValue = (optionId: number, value: string) => {
    setSelectedOptionValues((current) => {
      const values = current[optionId] ?? [];
      const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      if (next.length === 0) {
        const clone = { ...current };
        delete clone[optionId];
        return clone;
      }
      return { ...current, [optionId]: next };
    });
  };

  const removeOptionValueFromProduct = async (optionId: number, value: string) => {
    setSelectedOptionValues((current) => {
      const currentValues = current[optionId] ?? [];
      const next = currentValues.filter((item) => item !== value);

      if (next.length === 0) {
        const clone = { ...current };
        delete clone[optionId];
        return clone;
      }

      return { ...current, [optionId]: next };
    });

    if (!editingProductId) {
      return;
    }

    const existingValue = loadedOptionValues.find(
      (entry) =>
        entry.productOptionId === optionId &&
        entry.value.trim().toLowerCase() === value.trim().toLowerCase(),
    );

    if (!existingValue) {
      return;
    }

    try {
      await api(`/products/${editingProductId}/option-values/${existingValue.id}`, {
        method: "DELETE",
      });

      setLoadedOptionValues((current) => current.filter((entry) => entry.id !== existingValue.id));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el valor del producto.");
    }
  };

  const addOptionValue = async (optionId: number) => {
    const value = draftOptionValues[optionId]?.trim();
    if (!value) return;

    const normalizedValue = value.toLowerCase();
    const option = options.find((item) => item.id === optionId);
    const alreadyExists = (option?.reusableValues ?? []).some(
      (item) => item.value.trim().toLowerCase() === normalizedValue,
    );

    if (!alreadyExists) {
      setOptions((current) =>
        current.map((currentOption) => {
          if (currentOption.id !== optionId) {
            return currentOption;
          }

          return {
            ...currentOption,
            reusableValues: [
              ...(currentOption.reusableValues ?? []),
              { id: Date.now(), value },
            ],
          };
        }),
      );
    }

    setSelectedOptionValues((current) => {
      const currentValues = current[optionId] ?? [];
      if (currentValues.includes(value)) {
        return current;
      }
      return { ...current, [optionId]: [...currentValues, value] };
    });

    setDraftOptionValues((current) => ({ ...current, [optionId]: "" }));

    if (!editingProductId || alreadyExists) {
      return;
    }

    try {
      const created = await api(`/products/${editingProductId}/option-values`, {
        method: "POST",
        body: JSON.stringify({ productOptionId: optionId, value }),
      });

      setLoadedOptionValues((current) => [
        ...current,
        {
          id: created.id,
          productOptionId: created.productOptionId,
          value: created.value,
        },
      ]);

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el valor de la etiqueta.");
    }
  };

  const normalizeVariant = (variant: EditableVariant): EditableVariant => ({
    id: variant.id,
    sku: variant.sku.trim(),
    price: variant.price.trim(),
    Size: variant.Size.trim(),
    Color: variant.Color.trim(),
    inventoryQuantity: variant.inventoryQuantity.trim(),
    weight: variant.weight.trim(),
    width: variant.width.trim(),
    height: variant.height.trim(),
    length: variant.length.trim(),
  });

  const addVariant = () => {
    const normalized = normalizeVariant(variantDraft);

    if (!normalized.sku || !normalized.price) {
      setError("Cada variante necesita al menos SKU y precio.");
      return;
    }

    setVariants((current) => {
      const duplicateIndex = current.findIndex(
        (item) => item.sku.trim().toLowerCase() === normalized.sku.toLowerCase() && item.id !== normalized.id,
      );

      if (duplicateIndex >= 0) {
        const next = [...current];
        next[duplicateIndex] = normalized;
        return next;
      }

      return [...current, normalized];
    });

    setVariantDraft(emptyVariant());
    setError("");
  };

  const editVariant = (index: number) => {
    setVariants((current) => {
      const next = [...current];
      const [selected] = next.splice(index, 1);
      setVariantDraft(selected ?? emptyVariant());
      return next;
    });
  };

  const createOption = async () => {
    const name = newOptionName.trim();
    if (!name) return;
    try {
      setCreatingOption(true);
      const created = await api("/product-options", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setOptions((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewOptionName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la etiqueta.");
    } finally {
      setCreatingOption(false);
    }
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      setCreatingCategory(true);
      const created = await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setCategories((current) => [...current, created]);
      setSelectedCategoryIds((current) => [...new Set([...current, created.id])]);
      setNewCategoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoria.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const hydrateFormFromProduct = async (product: Product) => {
    setLoadingEditId(product.id);
    setError("");
    setSuccess("");

    try {
      const [productImages, productVariants, productOptionValues] = await Promise.all([
        api(`/products/${product.id}/images`),
        api(`/variants/${product.id}`),
        api(`/products/${product.id}/option-values`),
      ]);

      setEditingProductId(product.id);
      setForm({
        title: product.title,
        description: product.description ?? "",
        published: product.published,
      });
      setSelectedCategoryIds((product.categories ?? []).map((entry) => entry.category.id));

      const safeImages = Array.isArray(productImages) ? productImages : [];
      setExistingImages(safeImages);
      setOriginalImageIds(safeImages.map((image) => image.id));
      setImageFiles([]);

      const safeOptionValues = Array.isArray(productOptionValues) ? productOptionValues : [];
      setLoadedOptionValues(safeOptionValues);
      setSelectedOptionValues(
        safeOptionValues.reduce<Record<number, string[]>>((acc, item) => {
          acc[item.productOptionId] = [...(acc[item.productOptionId] ?? []), item.value];
          return acc;
        }, {}),
      );
      setDraftOptionValues({});

      const safeVariants = Array.isArray(productVariants)
        ? productVariants.map((variant) => ({
            id: variant.id,
            sku: String(variant.sku ?? ""),
            price: String(variant.price ?? ""),
            Size: String(variant.Size ?? ""),
            Color: String(variant.Color ?? ""),
            inventoryQuantity: String(variant.inventories?.[0]?.quantity ?? ""),
            weight: String(variant.weight ?? ""),
            width: String(variant.width ?? ""),
            height: String(variant.height ?? ""),
            length: String(variant.length ?? ""),
          }))
        : [];

      setVariants(safeVariants);
      setLoadedVariants(safeVariants);
      setVariantDraft(emptyVariant());

      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la edicion del producto.");
    } finally {
      setLoadingEditId(null);
    }
  };

  const syncCategories = async (productId: number, currentProduct: Product | undefined) => {
    const currentCategoryIds = (currentProduct?.categories ?? []).map((entry) => entry.category.id);
    const categoriesToAdd = selectedCategoryIds.filter((id) => !currentCategoryIds.includes(id));
    const categoriesToRemove = currentCategoryIds.filter((id) => !selectedCategoryIds.includes(id));

    await Promise.all([
      ...categoriesToAdd.map((categoryId) =>
        api(`/products/${productId}/categories/${categoryId}`, { method: "POST" }),
      ),
      ...categoriesToRemove.map((categoryId) =>
        api(`/products/${productId}/categories/${categoryId}`, { method: "DELETE" }),
      ),
    ]);
  };

  const syncImages = async (productId: number) => {
    const imagesToRemove = originalImageIds.filter((id) => !existingImages.some((image) => image.id === id));

    await Promise.all(
      imagesToRemove.map((imageId) =>
        api(`/products/${productId}/images/${imageId}`, { method: "DELETE" }),
      ),
    );

    for (const fileEntry of imageFiles.slice(0, 10)) {
      const formData = new FormData();
      formData.append("file", fileEntry.file);

      await api(`/products/${productId}/images/upload`, {
        method: "POST",
        body: formData,
      });
    }
  };

  const syncOptionValues = async (productId: number) => {
    const loadedLookup = new Map(
      loadedOptionValues.map((entry) => [`${entry.productOptionId}:${entry.value.trim().toLowerCase()}`, entry]),
    );
    const selectedEntries = Object.entries(selectedOptionValues)
      .flatMap(([optionIdRaw, values]) =>
        values.map((value) => ({
          productOptionId: Number(optionIdRaw),
          value: value.trim(),
        })),
      )
      .filter((entry) => entry.value);

    const selectedKeys = new Set(
      selectedEntries.map((entry) => `${entry.productOptionId}:${entry.value.toLowerCase()}`),
    );

    const valuesToDelete = loadedOptionValues.filter(
      (entry) => !selectedKeys.has(`${entry.productOptionId}:${entry.value.trim().toLowerCase()}`),
    );

    await Promise.all(
      valuesToDelete.map((entry) =>
        api(`/products/${productId}/option-values/${entry.id}`, { method: "DELETE" }),
      ),
    );

    for (const entry of selectedEntries) {
      if (loadedLookup.has(`${entry.productOptionId}:${entry.value.toLowerCase()}`)) {
        continue;
      }

      await api(`/products/${productId}/option-values`, {
        method: "POST",
        body: JSON.stringify(entry),
      });
    }
  };

  const syncVariants = async (productId: number) => {
    const loadedVariantIds = new Set(loadedVariants.map((variant) => variant.id).filter((id): id is number => Boolean(id)));
    const currentVariantIds = new Set(variants.map((variant) => variant.id).filter((id): id is number => Boolean(id)));

    await Promise.all(
      [...loadedVariantIds]
        .filter((variantId) => !currentVariantIds.has(variantId))
        .map((variantId) => api(`/variants/${variantId}`, { method: "DELETE" })),
    );

    for (const variant of variants) {
      const payload = {
        sku: variant.sku.trim(),
        price: Number(variant.price),
        Size: variant.Size.trim() || undefined,
        Color: variant.Color.trim() || undefined,
        inventoryQuantity: variant.inventoryQuantity.trim() ? Number(variant.inventoryQuantity) : undefined,
        weight: variant.weight.trim() ? Number(variant.weight) : undefined,
        width: variant.width.trim() ? Number(variant.width) : undefined,
        height: variant.height.trim() ? Number(variant.height) : undefined,
        length: variant.length.trim() ? Number(variant.length) : undefined,
      };

      if (variant.id) {
        await api(`/variants/${variant.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/variants", {
          method: "POST",
          body: JSON.stringify({ ...payload, productId }),
        });
      }
    }
  };

  const saveProduct = async () => {
    if (!form.title.trim()) {
      setError("El producto necesita un titulo.");
      return;
    }

    if (variants.some((variant) => !variant.sku.trim() || !variant.price.trim())) {
      setError("Cada variante cargada necesita al menos SKU y precio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const wasEditing = editingProductId;
      let productId = editingProductId;
      let currentProduct = products.find((product) => product.id === editingProductId);

      if (editingProductId) {
        await api(`/products/${editingProductId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            published: form.published,
          }),
        });
      } else {
        const created = await api("/products", {
          method: "POST",
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            published: form.published,
          }),
        });

        productId = created.id;
        currentProduct = created;
      }

      if (!productId) {
        throw new Error("Producto no encontrado");
      }

      await syncCategories(productId, currentProduct);
      await syncImages(productId);
      await syncOptionValues(productId);
      await syncVariants(productId);

      await loadData();
      resetForm();
      setSuccess(wasEditing ? "Producto actualizado desde el formulario principal." : "Producto creado con su carga completa.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={panelStyle}>
      <Header
        title="Productos"
        copy="La carga queda unificada: datos base, uploads reales de hasta 10 imagenes, etiquetas reutilizables, variantes e inventario. El catalogo actual baja a tabla para que sea mas facil de leer."
      />
      <div ref={formTopRef} />
      <section style={shellStyle}>
        {editingProductId ? (
          <div style={editingBannerStyle}>
            <div>
              <p style={eyebrowStyle}>Editando</p>
              <strong style={{ color: "#fff" }}>{form.title || "Producto sin titulo"}</strong>
            </div>
            <button type="button" onClick={resetForm} style={ghostButtonStyle}>
              Cancelar edicion
            </button>
          </div>
        ) : null}

        <div style={topGridStyle}>
          <Step title="Datos base">
            <label style={checkStyle}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              />
              Publicado
            </label>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Nombre del producto"
              style={fieldStyle}
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Breve descripcion"
              style={{ ...fieldStyle, minHeight: 120, resize: "vertical" }}
            />
          </Step>

          <Step title="Categorias">
            <div style={optionActionsStyle}>
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Nueva categoria"
                style={smallFieldStyle}
              />
              <button
                type="button"
                onClick={() => void createCategory()}
                disabled={creatingCategory || !newCategoryName.trim()}
                style={fullWidthSecondaryButtonStyle}
              >
                {creatingCategory ? "Creando..." : "Crear categoria"}
              </button>
            </div>
            <div style={chipRowStyle}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  style={chipToggleStyle(selectedCategoryIds.includes(category.id))}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </Step>
        </div>

        <Step title="Imagenes">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []).slice(0, 10);
              setImageFiles(files.map((file) => ({ file, name: file.name })));
            }}
            style={fieldStyle}
          />
          <span style={metaStyle}>Hasta 10 imagenes. Al editar, podes quitar las actuales y sumar nuevas.</span>

          {existingImages.length > 0 ? (
            <div style={compactTableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Imagen actual</th>
                    <th style={thStyle}>Ruta</th>
                    <th style={thStyle}>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {existingImages.map((image) => (
                    <tr key={image.id}>
                      <td style={tdStyle}>Imagen #{image.id}</td>
                      <td style={tdStyle}>{image.url}</td>
                      <td style={tdStyle}>
                        <button type="button" onClick={() => setExistingImages((current) => current.filter((item) => item.id !== image.id))} style={ghostButtonStyle}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {imageFiles.length > 0 ? (
            <div style={compactTableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Archivo nuevo</th>
                    <th style={thStyle}>Tamano</th>
                    <th style={thStyle}>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {imageFiles.map((entry, index) => (
                    <tr key={`${entry.name}-${index}`}>
                      <td style={tdStyle}>{entry.name}</td>
                      <td style={tdStyle}>{(entry.file.size / 1024 / 1024).toFixed(2)} MB</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() =>
                            setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
                          }
                          style={ghostButtonStyle}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Step>

        <Step title="Etiquetas reutilizables">
          <div style={rowWrapStyle}>
            <input
              value={newOptionName}
              onChange={(event) => setNewOptionName(event.target.value)}
              placeholder="Crear nueva etiqueta"
              style={smallFieldStyle}
            />
            <button
              type="button"
              onClick={createOption}
              disabled={creatingOption || !newOptionName.trim()}
              style={secondaryButtonStyle}
            >
              {creatingOption ? "Creando..." : "Crear"}
            </button>
          </div>
          <div style={optionGridStyle}>
            {options.map((option) => (
              <article key={option.id} style={optionCardStyle}>
                <strong style={{ color: "#fff" }}>{option.name}</strong>
                <div style={optionValuesAreaStyle}>
                  <div style={chipRowStyle}>
                    {(option.reusableValues ?? []).map((value) => (
                      <button
                        key={`${option.id}-${value.id}`}
                        type="button"
                        onClick={() => toggleOptionValue(option.id, value.value)}
                        style={chipToggleStyle((selectedOptionValues[option.id] ?? []).includes(value.value))}
                      >
                        {value.value}
                      </button>
                    ))}
                  </div>
                  {editingProductId && (selectedOptionValues[option.id] ?? []).length > 0 ? (
                    <div style={selectedValuesBlockStyle}>
                      <span style={metaStyle}>Asignados a este producto</span>
                      <div style={chipRowStyle}>
                        {(selectedOptionValues[option.id] ?? []).map((value) => (
                          <button
                            key={`${option.id}-selected-${value}`}
                            type="button"
                            onClick={() => void removeOptionValueFromProduct(option.id, value)}
                            style={removeChipStyle}
                          >
                            Quitar {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={optionActionsStyle}>
                  <input
                    value={draftOptionValues[option.id] ?? ""}
                    onChange={(event) =>
                      setDraftOptionValues((current) => ({ ...current, [option.id]: event.target.value }))
                    }
                    placeholder={`Nuevo valor para ${option.name}`}
                    style={smallFieldStyle}
                  />
                  <button type="button" onClick={() => addOptionValue(option.id)} style={fullWidthSecondaryButtonStyle}>
                    Agregar valor
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Step>

        <Step title="Variantes e inventario">
          <div style={variantGridStyle}>
            <input value={variantDraft.sku} onChange={(e) => setVariantDraft((c) => ({ ...c, sku: e.target.value }))} placeholder="SKU" style={fieldStyle} />
            <input value={variantDraft.price} onChange={(e) => setVariantDraft((c) => ({ ...c, price: e.target.value }))} placeholder="Precio" style={fieldStyle} />
            <input value={variantDraft.Size} onChange={(e) => setVariantDraft((c) => ({ ...c, Size: e.target.value }))} placeholder="Talle" style={fieldStyle} />
            <input value={variantDraft.Color} onChange={(e) => setVariantDraft((c) => ({ ...c, Color: e.target.value }))} placeholder="Color" style={fieldStyle} />
            <input value={variantDraft.inventoryQuantity} onChange={(e) => setVariantDraft((c) => ({ ...c, inventoryQuantity: e.target.value }))} placeholder="Stock" style={fieldStyle} />
            <input value={variantDraft.weight} onChange={(e) => setVariantDraft((c) => ({ ...c, weight: e.target.value }))} placeholder="Peso" style={fieldStyle} />
            <input value={variantDraft.width} onChange={(e) => setVariantDraft((c) => ({ ...c, width: e.target.value }))} placeholder="Ancho" style={fieldStyle} />
            <input value={variantDraft.height} onChange={(e) => setVariantDraft((c) => ({ ...c, height: e.target.value }))} placeholder="Alto" style={fieldStyle} />
            <input value={variantDraft.length} onChange={(e) => setVariantDraft((c) => ({ ...c, length: e.target.value }))} placeholder="Largo" style={fieldStyle} />
          </div>
          <div style={rowWrapStyle}>
            <button type="button" onClick={addVariant} style={secondaryButtonStyle}>
              {variantDraft.id ? "Actualizar variante" : "Agregar variante"}
            </button>
            {(variantDraft.sku || variantDraft.price) ? (
              <button type="button" onClick={() => setVariantDraft(emptyVariant())} style={ghostButtonStyle}>
                Limpiar variante
              </button>
            ) : null}
          </div>
          {variants.length > 0 ? (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>SKU</th>
                    <th style={thStyle}>Atributos</th>
                    <th style={thStyle}>Precio</th>
                    <th style={thStyle}>Stock</th>
                    <th style={thStyle}>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={`${variant.id ?? "new"}-${variant.sku}-${index}`}>
                      <td style={tdStyle}>{variant.sku}</td>
                      <td style={tdStyle}>{[variant.Size, variant.Color].filter(Boolean).join(" / ") || "Base"}</td>
                      <td style={tdStyle}>{money(variant.price)}</td>
                      <td style={tdStyle}>{variant.inventoryQuantity || "0"}</td>
                      <td style={tdStyle}>
                        <div style={rowWrapStyle}>
                          <button type="button" onClick={() => editVariant(index)} style={ghostButtonStyle}>
                            Editar
                          </button>
                          <button type="button" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={ghostButtonStyle}>
                            Quitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Step>

        <div style={footerStyle}>
          <div>
            {error ? <p style={errorStyle}>{error}</p> : null}
            {success ? <p style={successStyle}>{success}</p> : null}
          </div>
          <div style={rowWrapStyle}>
            <button type="button" onClick={resetForm} style={ghostButtonStyle}>
              {editingProductId ? "Cancelar" : "Limpiar"}
            </button>
            <button type="button" onClick={saveProduct} disabled={saving || !form.title.trim()} style={primaryButtonStyle}>
              {saving ? "Guardando..." : editingProductId ? "Guardar cambios" : "Crear producto completo"}
            </button>
          </div>
        </div>
      </section>

      <section style={tableSectionStyle}>
        <div style={betweenStyle}>
          <div>
            <p style={eyebrowStyle}>Catalogo actual</p>
            <h3 style={{ ...title3Style, marginTop: 8 }}>Vista resumida</h3>
          </div>
          <div style={rowWrapStyle}>
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Filtrar por producto, slug o categoria"
              style={searchFieldStyle}
            />
            <button type="button" onClick={() => void loadData()} style={secondaryButtonStyle}>Recargar</button>
          </div>
        </div>
        {loading ? <StateCard label="Cargando catalogo..." /> : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Producto</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Categorias</th>
                  <th style={thStyle}>Imagenes</th>
                  <th style={thStyle}>Variantes</th>
                  <th style={thStyle}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td style={tdStyle}>
                      <strong style={{ display: "block", color: "#fff" }}>{product.title}</strong>
                      <span style={metaStyle}>/{product.slug}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={statusStyle(product.published)}>{product.published ? "Publicado" : "Borrador"}</span>
                    </td>
                    <td style={tdStyle}>
                      {(product.categories ?? []).map((entry) => entry.category.name).join(", ") || "Sin categorias"}
                    </td>
                    <td style={tdStyle}>{product.images?.length ?? 0}</td>
                    <td style={tdStyle}>{product.variants?.length ?? 0}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => void hydrateFormFromProduct(product)}
                        style={ghostButtonStyle}
                        disabled={loadingEditId === product.id}
                      >
                        {loadingEditId === product.id ? "Cargando..." : "Editar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function AdminCategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api("/categories");
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar categorias.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const create = async () => {
    try {
      setSaving(true);
      const created = await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setCategories((current) => [created, ...current]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoria.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={panelStyle}>
      <Header title="Categorias" />
      <div style={twoColumnStyle}>
        <div style={blockStyle}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de categoria" style={fieldStyle} />
          <button type="button" onClick={create} disabled={saving || !name.trim()} style={primaryButtonStyle}>
            {saving ? "Guardando..." : "Crear categoria"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
        </div>
        <div style={blockStyle}>
          {loading ? <StateCard label="Cargando categorias..." /> : categories.map((category) => (
            <div key={category.id} style={itemStyle}>
              <strong style={{ color: "#fff" }}>{category.name}</strong>
              <span style={metaStyle}>/{category.slug}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminOrdersPanelSection() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api("/orders");
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar pedidos.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section style={panelStyle}>
      <Header
        title="Pedidos"
        copy="Vista operativa para detectar prioridad, entrar al detalle y llevar cada orden por una secuencia clara de trabajo."
      />
      {error ? <p style={errorStyle}>{error}</p> : null}
      {selectedOrderId ? (
        <AdminOrderDetailPanel
          orderId={selectedOrderId}
          onBack={() => setSelectedOrderId(null)}
          onOrderUpdated={(updatedOrder) => {
            setOrders((current) =>
              current.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order)),
            );
          }}
        />
      ) : null}
      {loading ? (
        <StateCard label="Cargando pedidos..." />
      ) : (
        <div style={ordersGridStyle}>
          {orders.map((order) => {
            const customerName =
              [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ").trim() ||
              order.customer?.email ||
              "Cliente sin identificar";
            const units = order.items.reduce((total, item) => total + item.quantity, 0);

            return (
              <article
                key={order.id}
                style={{ ...itemStyle, cursor: "pointer" }}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div style={betweenStyle}>
                  <div>
                    <strong style={{ display: "block", color: "#fff" }}>Pedido #{order.id}</strong>
                    <span style={metaStyle}>{new Date(order.createdAt).toLocaleString("es-AR")}</span>
                  </div>
                  <strong style={{ color: "#fff" }}>{money(order.total)}</strong>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <p style={copyStyle}>{customerName}</p>
                  <p style={copyStyle}>
                    {units} unidad{units === 1 ? "" : "es"} · {orderStatusLabel(order.status)}
                  </p>
                </div>

                <div style={rowWrapStyle}>
                  <span style={statusChipStyle(order.status)}>{orderStatusLabel(order.status)}</span>
                  {order.shippingMethod ? <span style={softChipStyle}>{order.shippingMethod}</span> : null}
                  {order.shipment?.trackingNumber ? <span style={softChipStyle}>Tracking listo</span> : null}
                </div>

                <div style={betweenStyle}>
                  <span style={metaStyle}>
                    {order.items.length} linea{order.items.length === 1 ? "" : "s"} de pedido
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedOrderId(order.id);
                    }}
                    style={ghostButtonStyle}
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Legacy fallback kept temporarily while we consolidate the new operational panel.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AdminOrdersSection() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api("/orders");
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar pedidos.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const updateStatus = async (orderId: number, status: string) => {
    try {
      setUpdatingId(orderId);
      const updated = await api(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, ...updated } : order)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section style={panelStyle}>
      <Header title="Pedidos" />
      {error ? <p style={errorStyle}>{error}</p> : null}
      {loading ? <StateCard label="Cargando pedidos..." /> : orders.map((order) => (
        <article key={order.id} style={itemStyle}>
          <div style={betweenStyle}>
            <div>
              <strong style={{ display: "block", color: "#fff" }}>Pedido #{order.id}</strong>
              <span style={metaStyle}>{new Date(order.createdAt).toLocaleDateString("es-AR")}</span>
            </div>
            <strong style={{ color: "#fff" }}>{money(order.total)}</strong>
          </div>
          <p style={copyStyle}>
            {order.items.length} item{order.items.length === 1 ? "" : "s"} • {orderStatusLabel(order.status)}
          </p>
          <select
            defaultValue={order.status}
            disabled={updatingId === order.id}
            onChange={(event) => void updateStatus(order.id, event.target.value)}
            style={selectStyle}
          >
            {statuses.map((status) => (
              <option key={status} value={status} style={optionStyle}>{orderStatusLabel(status)}</option>
            ))}
          </select>
        </article>
      ))}
    </section>
  );
}

function AdminCustomersSection() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api("/customers");
        setCustomers(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section style={panelStyle}>
      <Header title="Clientes" />
      {loading ? <StateCard label="Cargando clientes..." /> : (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Telefono</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td style={tdStyle}>
                    {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Sin nombre"}
                  </td>
                  <td style={tdStyle}>{customer.email}</td>
                  <td style={tdStyle}>{customer.phone || "Sin telefono cargado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Header({ title, copy }: { title: string; copy?: string }) {
  return (
    <div style={betweenStyle}>
      <div>
        <p style={eyebrowStyle}>Gestion</p>
        <h2 style={title2Style}>{title}</h2>
      </div>
      {copy ? <p style={copyStyle}>{copy}</p> : null}
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ ...blockStyle, height: "100%" }}>
      <div>
        <p style={eyebrowStyle}>Carga</p>
        <h3 style={title3Style}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article style={statStyle}>
      <span style={metaStyle}>{label}</span>
      <strong style={{ color: "#fff", fontSize: 28 }}>{value}</strong>
    </article>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 24 };
const shellStyle: React.CSSProperties = { display: "grid", gap: 18 };
const topGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, alignItems: "stretch" };
const statsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 };
const ordersGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 };
const twoColumnStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(280px,0.38fr) minmax(0,1fr)", gap: 20, alignItems: "start" };
const optionGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 };
const optionValuesAreaStyle: React.CSSProperties = { minHeight: 124, alignContent: "start" };
const optionActionsStyle: React.CSSProperties = { display: "grid", gap: 10, alignContent: "end", marginTop: "auto", alignSelf: "end" };
const selectedValuesBlockStyle: React.CSSProperties = { display: "grid", gap: 10, marginTop: 14 };
const variantGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 };
const chipRowStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const rowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" };
const rowWrapStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const betweenStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const footerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" };
const tableWrapStyle: React.CSSProperties = { width: "100%", overflowX: "auto" };
const compactTableWrapStyle: React.CSSProperties = { width: "100%", overflowX: "auto", maxHeight: 220 };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, outline: "none" };
const smallFieldStyle: React.CSSProperties = { ...fieldStyle, padding: "12px 14px" };
const searchFieldStyle: React.CSSProperties = { ...smallFieldStyle, minWidth: 280 };
const editGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) auto", gap: 14, alignItems: "start" };
const selectStyle: React.CSSProperties = { ...fieldStyle, maxWidth: 260, background: "#161616", color: "#f7f1e8", appearance: "auto" };
const primaryButtonStyle: React.CSSProperties = { padding: "14px 18px", background: "#f7f1e8", color: "#0b0b0b", border: "none", borderRadius: 999, cursor: "pointer", fontWeight: 700 };
const secondaryButtonStyle: React.CSSProperties = { padding: "10px 14px", background: "transparent", color: "#f7f1e8", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, cursor: "pointer" };
const fullWidthSecondaryButtonStyle: React.CSSProperties = { ...secondaryButtonStyle, width: "fit-content" };
const ghostButtonStyle: React.CSSProperties = { padding: "10px 14px", background: "rgba(255,255,255,0.04)", color: "#f7f1e8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, cursor: "pointer" };
const blockStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,8,8,0.42)", padding: 20, display: "grid", gap: 14 };
const editingBannerStyle: React.CSSProperties = { ...blockStyle, gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 12 };
const itemStyle: React.CSSProperties = { ...blockStyle, gap: 10 };
const optionCardStyle: React.CSSProperties = { ...blockStyle, padding: 16, alignContent: "stretch", minHeight: 360, gridTemplateRows: "auto minmax(0, 1fr) auto" };
const tableSectionStyle: React.CSSProperties = { ...blockStyle, gap: 16 };
const statStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 22, display: "grid", gap: 8 };
const stateStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", padding: 24, color: "rgba(247,241,232,0.72)" };
const metaStyle: React.CSSProperties = { color: "rgba(247,241,232,0.52)", fontSize: 13 };
const copyStyle: React.CSSProperties = { margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.7, maxWidth: 720 };
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, color: "rgba(247,241,232,0.56)" };
const title2Style: React.CSSProperties = { margin: "10px 0 0", fontSize: "clamp(1.8rem,2vw,2.6rem)", letterSpacing: "-0.05em" };
const title3Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 22, color: "#fff" };
const checkStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, color: "#f7f1e8" };
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0 0 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "rgba(247,241,232,0.54)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" };
const tdStyle: React.CSSProperties = { padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#f7f1e8", verticalAlign: "top" };
const optionStyle: React.CSSProperties = { background: "#161616", color: "#f7f1e8" };
const statusStyle = (published: boolean): React.CSSProperties => ({ display: "inline-flex", padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: published ? "rgba(184,245,194,0.12)" : "rgba(255,255,255,0.04)", color: published ? "#b8f5c2" : "#f7f1e8", fontSize: 12 });
const statusChipStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    status === "cancelled"
      ? "rgba(255,159,159,0.12)"
      : status === "delivered"
        ? "rgba(184,245,194,0.12)"
        : status === "shipped"
          ? "rgba(129,199,255,0.12)"
          : "rgba(255,255,255,0.05)",
  color:
    status === "cancelled"
      ? "#ffd6d6"
      : status === "delivered"
        ? "#cbffd2"
        : "#f7f1e8",
  fontSize: 12,
});
const softChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  color: "rgba(247,241,232,0.68)",
  fontSize: 12,
};
const chipToggleStyle = (selected: boolean): React.CSSProperties => ({ padding: "9px 12px", borderRadius: 999, border: selected ? "1px solid rgba(255,214,122,0.58)" : "1px solid rgba(255,255,255,0.12)", background: selected ? "linear-gradient(180deg, rgba(255,214,122,0.28), rgba(255,173,51,0.18))" : "rgba(255,255,255,0.03)", color: selected ? "#fff6df" : "#f7f1e8", boxShadow: selected ? "0 0 0 1px rgba(255,183,77,0.18) inset" : "none", cursor: "pointer" });
const removeChipStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,159,159,0.28)", background: "rgba(255,159,159,0.08)", color: "#ffd6d6", cursor: "pointer" };
