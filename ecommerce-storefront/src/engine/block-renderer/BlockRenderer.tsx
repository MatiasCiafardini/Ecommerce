import { resolveBlockDefinition } from "@/config/block-registry";
import { Block } from "@/types/block";

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

        const animationClass =
          resolvedProps?.animationPreset === "soft"
            ? "theme-enter-soft"
            : resolvedProps?.animationPreset === "none"
              ? ""
              : "theme-enter-up";

        return (
          <div
            key={index}
            className={animationClass}
            style={{
              animationDelay: `${index * 90}ms`,
            }}
          >
            <Component {...resolvedProps} />
          </div>
        );
      })}
    </>
  );
}
