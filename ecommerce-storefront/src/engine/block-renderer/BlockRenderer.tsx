

import { blockRegistry } from "@/config/block-registry";
import { Block } from "@/types/block";

type Props = {
  blocks: Block[];
};

export default function BlockRenderer({ blocks }: Props) {
  return (
    <>
      {blocks.map((block, index) => {
        const Component = blockRegistry[block.type];

        if (!Component) return null;

        return <Component key={index} {...block.props} />;
      })}
    </>
  );
}
