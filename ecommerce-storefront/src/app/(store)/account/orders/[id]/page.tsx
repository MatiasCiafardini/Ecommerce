import OrderDetailView from "@/components/account/OrderDetailView";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountOrderPage({ params }: Props) {
  const { id } = await params;

  return <OrderDetailView orderId={Number(id)} />;
}
