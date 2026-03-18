import { getCategories } from "@/services/categories.service";

type Props = {
  title?: string;
  columns?: number;
};

export default async function CategoryGrid({
  title = "Categorías",
  columns = 3,
}: Props) {
  const categories = await getCategories();

  return (
    <section style={{ padding: "80px 20px" }}>
      <h2 style={{ marginBottom: "30px" }}>{title}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns},1fr)`,
          gap: "20px",
        }}
      >
        {categories.map((cat: any) => {
          const imageUrl = cat.image || "https://picsum.photos/400";

          return (
            <div key={cat.id}>
              <img src={imageUrl} style={{ width: "100%" }} />

              <h3>{cat.name}</h3>
            </div>
          );
        })}
      </div>
    </section>
  );
}
