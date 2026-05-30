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
    <section className="relative min-h-[calc(100svh-86px)] w-full overflow-hidden rounded-[1rem] border border-border bg-surface sm:min-h-[70vh] sm:rounded-[2rem] lg:rounded-[2.5rem]">
      {/* Background Image & Overlays */}
      <div className="absolute inset-0">
        {image ? (
          <Image
            alt="Hero background"
            className="h-full w-full object-cover opacity-50 transition-opacity duration-1000"
            height={1080}
            priority
            src={image}
            suppressHydrationWarning
            width={1920}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-surface to-background divider-grid opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/86 via-black/58 to-black/18" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/8 to-black/24" />
      </div>

      <div className="relative z-10 flex min-h-[inherit] items-center px-4 py-7 sm:px-8 sm:py-12 md:px-12 lg:px-20">
        <div className="grid w-full gap-6 sm:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-4xl">
            <Badge tone="accent">SRHXtra • Editorial</Badge>
            <h1 className="mt-5 max-w-[12ch] editorial-title leading-[1.02] text-white sm:mt-7">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/84 sm:mt-7 sm:text-lg lg:text-xl">
              {description}
            </p>
            <div className="mt-7 grid gap-3 sm:mt-9 sm:flex sm:flex-wrap sm:gap-4">
              <Button className="justify-center" href="/news/" size="lg">Latest updates</Button>
              <Button
                className="justify-center border-white/30 bg-white/12 text-white hover:bg-white hover:text-foreground"
                href="/match-coverage/"
                size="lg"
                variant="secondary"
              >
                Archive
              </Button>
            </div>
          </div>

          {leadStory ? (
            <div className="glass-panel group relative p-4 transition-transform hover:-translate-y-1 sm:p-7 lg:p-10">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                  {leadStory.label}
                </p>
              </div>
              <h2 className="mt-4 text-lg font-black uppercase leading-tight tracking-tight text-foreground sm:mt-6 sm:text-3xl lg:text-4xl">
                {leadStory.title}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted sm:mt-4 sm:text-base">
                {leadStory.excerpt}
              </p>
              <div className="mt-6 sm:mt-8">
                <Button
                  href={leadStory.href}
                  rel={leadStory.isExternal ? "noreferrer" : undefined}
                  size="md"
                  target={leadStory.isExternal ? "_blank" : undefined}
                  variant="outline"
                  className="w-full"
                >
                  Full report
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
