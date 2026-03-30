import { resolveBlockDefinition } from "@/config/block-registry";
import { Block } from "@/types/block";
import BlockReveal from "./BlockReveal";

type Props = {
  blocks: Block[];
  themeName?: string;
};

export default function BlockRenderer({ blocks, themeName }: Props) {
  const safeBlocks = Array.isArray(blocks) ? blocks : [];

  return (
    <>
      {safeBlocks.map((block, index) => {
        if (!block || typeof block.type !== "string" || !block.type.trim()) {
          console.error("Skipping invalid storefront block", {
            index,
            themeName,
            block,
          });
          return null;
        }

        const definition = resolveBlockDefinition(themeName, block.type);
        const Component = definition?.component;

        if (!Component) {
          console.error("Missing storefront block definition", {
            index,
            themeName,
            blockType: block.type,
          });
          return null;
        }

        const resolvedProps = {
          ...definition?.defaultProps,
          ...block.props,
        };

        const animationPreset =
          resolvedProps?.animationPreset === "soft"
            ? "soft"
            : resolvedProps?.animationPreset === "none"
              ? "none"
              : "up";

        return (
          <BlockReveal key={index} preset={animationPreset} delayMs={index * 90}>
            <Component {...resolvedProps} />
          </BlockReveal>
        );
      })}
    </>
  );
}
