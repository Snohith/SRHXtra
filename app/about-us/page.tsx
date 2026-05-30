import { ArticleBody } from "@/components/articles/ArticleBody";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getSiteConfig, getStaticPage } from "@/lib/content/site";
import { buildPageMetadata } from "@/lib/seo/metadata";

const aboutPage = getStaticPage("about-us");
const site = getSiteConfig();

export const metadata = buildPageMetadata({
  title: "About SRHXtra — Our Independent SRH Editorial Mission",
  description: "Learn about the mission behind SRHXtra.",
  path: "/about-us/",
});

export default function AboutUsPage() {
  return (
    <div className="page-stack">
      <SectionHeader
        title={aboutPage.title}
        variant="hero"
        headingLevel={1}
        action={
          <Button href="/news/" size="sm" variant="secondary">
            Visit the news desk
          </Button>
        }
      />

      <section className="section-stack">
        <div className="glass-panel p-8 sm:p-12">
          <div className="flex flex-wrap gap-2 mb-8">
            <Tag label="Independent Editorial" />
            <Tag label="SRH Fan Media" />
            <Tag label="Analytical Approach" />
          </div>
          <p className="editorial-title !text-3xl sm:!text-4xl lg:!text-5xl leading-tight text-foreground mb-8">
            Elevating the SRH narrative through world-class editorial standards.
          </p>
          <p className="max-w-4xl text-xl leading-relaxed text-muted sm:text-2xl">
            {site.organization.description}
          </p>
        </div>
      </section>

      <section className="section-stack">
        <SectionHeader
          title="Editorial Philosophy"
        />
        <ArticleBody content={aboutPage.content} />
      </section>

      <section className="section-stack">
        <SectionHeader
          title="Transparency"
        />
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-panel p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Coverage Scope</p>
          <p className="mt-6 text-xl font-black text-foreground leading-tight">News, Tactical Reports, Features, and Immersive Galleries.</p>
        </div>
        <div className="glass-panel p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Core Approach</p>
          <p className="mt-6 text-xl font-black text-foreground leading-tight">Fast, clear, and mobile-first elite publishing standards.</p>
        </div>
        <div className="glass-panel p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Primary Audience</p>
          <p className="mt-6 text-xl font-black text-foreground leading-tight">Dedicated supporters seeking sharper, analytical SRH context.</p>
        </div>
      </div>
    </div>
  );
}
