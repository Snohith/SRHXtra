import { ImageResponse } from "next/og";
import { API_BASE } from "@/lib/api";

/**
 * Per-article Open Graph image (Step 5 SEO). Rendered on demand from the
 * article's live title/category, so shared links always look right — even for
 * stories with no uploaded cover photo.
 */
export const runtime = "nodejs";
export const alt = "Article on SRH News";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchHeadline(
  slug: string,
): Promise<{ title: string; category: string | null } | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/articles/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      title?: unknown;
      categoryName?: unknown;
    };
    return {
      title: typeof body.title === "string" ? body.title : "",
      category:
        typeof body.categoryName === "string" ? body.categoryName : null,
    };
  } catch {
    return null;
  }
}

export default async function ArticleOpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await fetchHeadline(params.slug);
  const title = article?.title || "SRH News — Sunrisers Hyderabad coverage";
  const fontSize = title.length > 95 ? 52 : title.length > 65 ? 62 : 74;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#191c20",
        padding: 64,
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#f26522",
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
              color: "#191c20",
            }}
          >
            SRH
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>
            SRH NEWS
          </div>
        </div>
        {article?.category ? (
          <div
            style={{
              display: "flex",
              background: "#f26522",
              color: "#191c20",
              fontSize: 24,
              fontWeight: 700,
              padding: "10px 26px",
              borderRadius: 999,
            }}
          >
            {article.category}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          fontSize,
          fontWeight: 800,
          lineHeight: 1.12,
          maxHeight: 360,
          overflow: "hidden",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          height: 12,
          background: "#f26522",
          borderRadius: 6,
        }}
      />
    </div>,
    size,
  );
}
