import BlockRenderer from "@/engine/block-renderer/BlockRenderer";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export default async function HomePage() {
  const config = await getTenantConfig();

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 30%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
      }}
    >
      <BlockRenderer blocks={config.pages.home} />
    </div>
  );
}
