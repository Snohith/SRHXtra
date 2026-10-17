import Link from "next/link";
import {
  ArticleCard,
  BreakingStrip,
  FeaturedStory,
} from "@/components/ArticleCard";
import { getCategories, getFeed } from "@/lib/api";

export const revalidate = 60;

export default async function Home() {
  const [latest, categories] = await Promise.all([
    getFeed({ page: 1, pageSize: 7 }),
    getCategories(),
  ]);

  const [featured, ...rest] = latest.data;
  const topCategories = categories.slice(0, 3);
  const byCategory = await Promise.all(
    topCategories.map((c) =>
      getFeed({ page: 1, pageSize: 3, category: c.slug }),
    ),
  );

  return (
    <>
      <BreakingStrip articles={latest.data.slice(0, 1)} />
      <div className="wrap">
        {featured ? (
          <section className="section" aria-label="Featured story">
            <FeaturedStory article={featured} />
          </section>
        ) : (
          <section className="section">
            <div className="empty">
              <strong>No stories yet.</strong>
              <br />
              Publish an article in the admin dashboard and it appears here
              automatically.
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section className="section" aria-label="Latest news">
            <div className="section-head">
              <h2>Latest news</h2>
              <Link href="/news">All stories →</Link>
            </div>
            <div className="cards">
              {rest.slice(0, 6).map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}

        {topCategories.map((cat, i) => {
          const feed = byCategory[i];
          if (feed.data.length === 0) return null;
          return (
            <section className="section" key={cat.id} aria-label={cat.name}>
              <div className="section-head">
                <h2>{cat.name}</h2>
                <Link href={`/news?category=${cat.slug}`}>
                  More {cat.name.toLowerCase()} →
                </Link>
              </div>
              <div className="cards">
                {feed.data.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          );
        })}

        {categories.length > 0 && (
          <section className="section" aria-label="Browse by category">
            <div className="section-head">
              <h2>Browse topics</h2>
            </div>
            <div className="chips">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  className="chip"
                  href={`/news?category=${c.slug}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
