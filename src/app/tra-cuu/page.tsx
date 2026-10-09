// Trang tra cứu ngân hàng câu hỏi.
import type { Metadata } from "next";
import { getTopicsWithCounts } from "@/lib/queries";
import { BankClient } from "@/components/bank-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tra cứu ngân hàng câu hỏi",
};

type BankPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function BankPage({ searchParams }: BankPageProps) {
  const params = await searchParams;
  const initialQuery = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const topics = await getTopicsWithCounts();
  return (
    <BankClient
      initialQuery={initialQuery}
      topics={topics.map((t) => ({
        id: t.id,
        name: t.name,
        colorFrom: t.colorFrom,
        colorTo: t.colorTo,
      }))}
    />
  );
}
