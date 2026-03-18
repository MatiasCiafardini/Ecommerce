
import { blockRegistry } from "@/config/block-registry";
import { Block } from "@/types/block";

type Props = {
  blocks: Block[];
};

export default function BlockRenderer({ blocks }: Props) {
  return (
    <>
      {blocks.map((block, index) => {
        const registryKey = block.type as keyof typeof blockRegistry;
        const Component = blockRegistry[registryKey];

        if (!Component) return null;

        const animationClass =
          block.props?.animationPreset === "soft"
            ? "theme-enter-soft"
            : block.props?.animationPreset === "none"
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
            <Component {...block.props} />
          </div>
        );
      })}
    </>
  );
}
