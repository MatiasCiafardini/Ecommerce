"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { setScopedStorageItem } from "@/lib/store-browser-storage";
import { useAuth, type User } from "@/context/auth-context";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function ProfileSection({ user }: { user: User }) {
  const { setUser } = useAuth();
  const isAdmin = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role ?? "");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<ProfileForm>({
    firstName: isAdmin ? user.name ?? "" : user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    password: "",
    confirmPassword: "",
  });

  const displayName = useMemo(() => {
    const fullName = isAdmin
      ? user.name?.trim() ?? ""
      : [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return fullName || "Todavia no cargaste tu nombre";
  }, [isAdmin, user.firstName, user.lastName, user.name]);

  const startEdit = () => {
    setEditing(true);
    setError("");
    setSuccess("");
    setForm({
      firstName: isAdmin ? user.name ?? "" : user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      password: "",
      confirmPassword: "",
    });
  };

  const cancelEdit = () => {
    setEditing(false);
    setError("");
    setSuccess("");
    setForm({
      firstName: isAdmin ? user.name ?? "" : user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      password: "",
      confirmPassword: "",
    });
  };

  const saveProfile = async () => {
    if (form.password && form.password !== form.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const payload: Record<string, string> = isAdmin
        ? {
            name: form.firstName.trim(),
          }
        : {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone.trim(),
          };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const updatedUser = await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setScopedStorageItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditing(false);
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setSuccess("Tus datos se actualizaron correctamente.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={cardStyle} data-account-panel>
      <div style={sectionHeader}>
        <div>
          <p style={eyebrowStyle}>Perfil</p>
          <h2 style={titleStyle}>Datos principales</h2>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {editing ? (
            <>
              <button onClick={saveProfile} disabled={loading} style={primaryButton}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
              <button onClick={cancelEdit} style={secondaryButton}>
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={startEdit} style={secondaryButton}>
              Editar
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <div className="layout-form-two">
          <div>
            <label style={labelStyle}>{isAdmin ? "Nombre visible" : "Nombre"}</label>
            {editing ? (
              <input
                placeholder={isAdmin ? "Nombre del operador" : "Nombre"}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <div style={readonlyField}>
                {isAdmin ? user.name || "Todavia no cargado" : user.firstName || "Todavia no cargado"}
              </div>
            )}
          </div>

          {!isAdmin ? (
            <div>
              <label style={labelStyle}>Apellido</label>
              {editing ? (
                <input
                  placeholder="Apellido"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <div style={readonlyField}>{user.lastName || "Todavia no cargado"}</div>
              )}
            </div>
          ) : null}
        </div>

        <div>
          <label style={labelStyle}>{isAdmin ? "Nombre de cuenta" : "Nombre completo"}</label>
          <div style={readonlyField}>{displayName}</div>
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <div style={readonlyField}>{user.email}</div>
        </div>

        {!isAdmin ? (
          <div>
            <label style={labelStyle}>Telefono</label>
            {editing ? (
              <input
                placeholder="Ej. +54 11 5555 5555"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <div style={readonlyField}>{user.phone || "Todavia no cargaste telefono"}</div>
            )}
          </div>
        ) : null}

        <div className="layout-form-two">
          <div>
            <label style={labelStyle}>Nueva contrasena</label>
            {editing ? (
              <input
                type="password"
                placeholder="Dejar vacio para no cambiarla"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <div style={readonlyField}>Protegida</div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Confirmar contrasena</label>
            {editing ? (
              <input
                type="password"
                placeholder="Repeti la nueva contrasena"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <div style={readonlyField}>Solo se usa al editar</div>
            )}
          </div>
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}
        {success ? <p style={successStyle}>{success}</p> : null}
      </div>
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 32,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "var(--account-text-muted)",
};

const readonlyField: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 16,
  background: "var(--account-item-bg)",
  border: "1px solid var(--account-item-border)",
  color: "var(--account-text-strong)",
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

const primaryButton: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--checkout-primary-bg)",
  color: "var(--checkout-primary-color)",
  border: "1px solid var(--account-item-border-active)",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton: React.CSSProperties = {
  padding: "12px 16px",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border)",
  borderRadius: 999,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--admin-danger-color)",
};

const successStyle: React.CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid var(--admin-tone-success-border)",
  background: "var(--admin-tone-success-bg)",
  color: "var(--admin-tone-success-color)",
  fontWeight: 700,
  lineHeight: 1.5,
};
