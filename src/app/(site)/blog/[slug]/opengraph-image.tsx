import { ImageResponse } from "next/og";
import { getPublishedPost } from "@/lib/posts/repository";
import { getSeoDefaults } from "@/lib/seo/repository";

/**
 * Dynamic Open Graph image for a blog post (MVP.md §6.1).
 *
 * Used when a post has no cover image of its own: a share card with the real
 * title beats a generic site logo, and it costs one render per request. The
 * image is cached hard at the CDN because a post's title rarely changes.
 *
 * `next/og` runs on the edge runtime, so this file must not import anything
 * that needs Node built-ins. The post read goes through the same cached
 * repository the page uses, which is safe here.
 */
export const runtime = "nodejs";
export const revalidate = 86400;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // The image convention passes route params as a destructured object, not as a
  // second argument (see the opengraph-image docs, `params` is optional).
  const { slug } = await params;
  const [post, seo] = await Promise.all([getPublishedPost(slug), getSeoDefaults()]);

  const title = post?.seoTitle || post?.title || "Junaed Hossain";
  const eyebrow = post?.categoryName ?? seo.siteName;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #271164 0%, #4f22b5 55%, #9e8cf9 100%)",
          padding: "72px 80px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,255,255,0.16)",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {seo.siteName.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.92 }}>{eyebrow}</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 90 ? 56 : 68,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            maxWidth: 1000,
          }}
        >
          {title.length > 160 ? `${title.slice(0, 157)}…` : title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            opacity: 0.85,
          }}
        >
          <span>{seo.siteName}</span>
          <span>{seo.siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
