import OrderReceiptView from "@/components/account/OrderReceiptView";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountOrderReceiptPage({ params }: Props) {
  const { id } = await params;

  return <OrderReceiptView orderId={Number(id)} />;
}
