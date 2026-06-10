import BlockRenderer from "@/engine/block-renderer/BlockRenderer";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export const revalidate = 600;

export default async function HomePage() {
  const config = await getTenantConfig();
  const homeBlocks = Array.isArray(config.pages?.home) ? config.pages.home : [];

  return (
    <div data-store-content>
      <BlockRenderer blocks={homeBlocks} themeName={config.theme} />
    </div>
  );
}
