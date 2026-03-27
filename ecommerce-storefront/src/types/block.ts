import type { ComponentType } from "react";

export type BlockProps = Record<string, unknown>;

export type Block = {
  type: string;
  props?: BlockProps;
};

export type BlockComponent = ComponentType<BlockProps>;

export type ThemeBlockDefinition = {
  component?: BlockComponent;
  defaultProps?: BlockProps;
};
