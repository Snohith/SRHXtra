import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface HeroSectionProps {
  title: string;
  description: string;
  image?: string;
  leadStory?: {
    label: string;
    title: string;
    excerpt: string;
    href: string;
    isExternal?: boolean;
  };
}

export function HeroSection({ title, description, image, leadStory }: HeroSectionProps) {
  return (
    <section className="relative min-h-[62vh] w-full overflow-hidden rounded-[1.75rem] border border-white/5 bg-black sm:min-h-[70vh] sm:rounded-[2.5rem]">
      {/* Background Image & Overlays */}
      <div className="absolute inset-0">
        {image ? (
          <Image
            alt="Hero background"
            className="h-full w-full object-cover opacity-50 transition-opacity duration-1000"
            height={1080}
            priority
            src={image}
            width={1920}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-surface to-background divider-grid opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10 flex h-full items-center px-5 py-10 sm:px-12 sm:py-16 lg:px-20">
        <div className="grid w-full gap-8 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-4xl">
            <Badge tone="accent">SRHXtra • Editorial</Badge>
            <h1 className="mt-6 max-w-[12ch] editorial-title leading-[1.05] tracking-tighter sm:mt-8">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-muted sm:mt-8 sm:text-xl">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 sm:mt-10 sm:gap-4">
              <Button href="/news/" size="lg">Explore news</Button>
              <Button href="/match-coverage/" size="lg" variant="secondary">
                Match coverage
              </Button>
            </div>
          </div>

          {leadStory ? (
            <div className="glass-panel group relative p-6 transition-transform hover:-translate-y-1 sm:p-10">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                  {leadStory.label}
                </p>
              </div>
              <h2 className="mt-5 text-2xl font-black uppercase leading-tight tracking-tight text-white sm:mt-6 sm:text-4xl">
                {leadStory.title}
              </h2>
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted sm:text-base">
                {leadStory.excerpt}
              </p>
              <div className="mt-8">
                <Button
                  href={leadStory.href}
                  rel={leadStory.isExternal ? "noreferrer" : undefined}
                  size="md"
                  target={leadStory.isExternal ? "_blank" : undefined}
                  variant="outline"
                  className="w-full"
                >
                  Read full story
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
