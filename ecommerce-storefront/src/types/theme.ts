import type { ThemeBlockDefinition } from "@/types/block";

export type Theme = {
  name: string;
  className: string;
  Header?: React.ComponentType;
  Footer?: React.ComponentType;
  tokens?: Record<string, unknown>;
  blocks?: Record<string, ThemeBlockDefinition | undefined>;
};
