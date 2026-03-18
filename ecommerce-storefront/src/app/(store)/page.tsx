import BlockRenderer from "@/engine/block-renderer/BlockRenderer";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export default async function HomePage() {
  const config = await getTenantConfig();

  return <BlockRenderer blocks={config.pages.home} />;
}
