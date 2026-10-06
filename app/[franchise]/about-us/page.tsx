import Link from "next/link";

import { ArticleBody } from "@/components/articles/ArticleBody";
import { getStaticPage } from "@/lib/content/site";
import { buildPageMetadata } from "@/lib/seo/metadata";

const aboutPage = getStaticPage("about-us");

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "About SRHXtra — Supporter-Run SRH Coverage",
  description:
    "SRHXtra is a supporter-run Sunrisers Hyderabad site: 2026 match coverage, news, squad profiles, stats and photo galleries.",
  path: "/sunrisers-hyderabad/about-us/",
});


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function AboutUsPage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);

  return (
    <div className="page-stack">
      <header className="section-stack">
        <p className="eyebrow">About</p>
        <h1 className="section-title uppercase">About SRHXtra</h1>
        <p className="body-copy max-w-3xl">
          A supporter-run Sunrisers Hyderabad site: 2026 match coverage, news, squad
          profiles, stats and photo galleries.
        </p>
      </header>
      <ArticleBody content={aboutPage.content} dropCap={false} />

      <section className="glass-panel flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
            Start reading
          </p>
          <p className="mt-2 text-2xl font-black uppercase tracking-tight text-foreground">
            Pick a game, any game
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sunrisers-hyderabad/match-coverage/"
            className="rounded-full bg-[#ff6d00] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e05f00]"
          >
            Match coverage
          </Link>
          <Link
            href="/sunrisers-hyderabad/squad/"
            className="rounded-full border border-border px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Meet the squad
          </Link>
        </div>
      </section>
    </div>
  );
}
