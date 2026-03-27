"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ThemeSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ThemeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ThemeSelectOption[];
  placeholder?: string;
  menuPlacement?: "top" | "bottom";
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
};

type ThemePalette = {
  selectBorder: string;
  panelBg: string;
  textStrong: string;
  textMuted: string;
  selectedBg: string;
};

export default function ThemeSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  menuPlacement = "bottom",
}: ThemeSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [palette, setPalette] = useState<ThemePalette | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const canUseDom = typeof window !== "undefined";

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useLayoutEffect(() => {
    if (!canUseDom || !open || !rootRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const styles = window.getComputedStyle(rootRef.current);
      const spacing = 8;

      setPalette({
        selectBorder:
          styles.getPropertyValue("--select-border").trim() ||
          styles.getPropertyValue("--border-soft").trim() ||
          "rgba(255,255,255,0.12)",
        panelBg:
          styles.getPropertyValue("--page-panel-strong-bg").trim() ||
          "rgba(18,18,18,0.98)",
        textStrong:
          styles.getPropertyValue("--text-strong").trim() || "#f7f1e8",
        textMuted:
          styles.getPropertyValue("--text-muted").trim() || "rgba(247,241,232,0.54)",
        selectedBg:
          styles.getPropertyValue("--ghost-chip-active-bg").trim() ||
          "rgba(255,255,255,0.08)",
      });

      if (menuPlacement === "top") {
        setMenuPosition({
          bottom: window.innerHeight - rect.top + spacing,
          left: rect.left,
          width: rect.width,
        });
        return;
      }

      setMenuPosition({
        top: rect.bottom + spacing,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [canUseDom, menuPlacement, open]);

  const selectedOption = options.find((option) => option.value === value);

  const menu =
    canUseDom && open && menuPosition && palette
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="theme-vertical-scroll"
            style={{
              ...menuPortalStyle(palette),
              ...menuPosition,
            }}
          >
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                style={{
                    ...optionStyle(palette),
                    ...(selected ? selectedOptionStyle(palette) : null),
                    ...(option.disabled ? disabledOptionStyle : null),
                }}
              >
                  {option.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        style={{
          ...rootStyle,
          ...(open ? openRootStyle : null),
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          style={triggerStyle}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span style={triggerLabelStyle}>{selectedOption?.label ?? placeholder}</span>
          <span style={triggerChevronStyle}>{open ? "▲" : "▼"}</span>
        </button>
      </div>
      {menu}
    </>
  );
}

const rootStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const openRootStyle: React.CSSProperties = {
  zIndex: 60,
};

const triggerStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid var(--select-border, var(--border-soft))",
  background: "var(--select-bg, var(--muted-field-bg))",
  color: "var(--select-color, var(--muted-field-color))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  textAlign: "left",
  cursor: "pointer",
};

const triggerLabelStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const triggerChevronStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  flexShrink: 0,
};

function menuPortalStyle(palette: ThemePalette): React.CSSProperties {
  return {
    position: "fixed",
    zIndex: 2000,
    display: "grid",
    gap: 6,
    padding: 8,
    borderRadius: 18,
    border: `1px solid ${palette.selectBorder}`,
    background: palette.panelBg,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.22)",
    maxHeight: 280,
    overflowY: "auto",
  };
}

function optionStyle(palette: ThemePalette): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid transparent",
    background: "transparent",
    color: palette.textStrong,
    textAlign: "left",
    cursor: "pointer",
  };
}

function selectedOptionStyle(palette: ThemePalette): React.CSSProperties {
  return {
    background: palette.selectedBg,
    borderColor: palette.selectBorder,
    color: palette.textStrong,
  };
}

const disabledOptionStyle: React.CSSProperties = {
  opacity: 0.45,
  cursor: "not-allowed",
};
