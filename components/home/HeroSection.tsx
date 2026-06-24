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

export function HeroSection({ title, description, leadStory }: HeroSectionProps) {
  return (
    <section className="w-full overflow-hidden rounded-[1.5rem] border border-border bg-[#0d0d0d] shadow-sm">
      <div className="grid w-full gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Side — Gradient Box */}
        <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-gradient-to-br from-[#ff6d00] via-[#d35400] to-[#1a0a00] text-white">
          <div className="relative z-10 max-w-xl">
            <Badge tone="accent" className="bg-white/20 text-white border-none font-black">
              SRHXtra • Editorial
            </Badge>
            <h1 className="mt-6 text-3xl font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl text-white">
              {title}
            </h1>
            <p className="mt-5 text-sm font-medium leading-relaxed text-white/80 sm:text-lg">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button 
                className="bg-white text-black hover:bg-neutral-100 border-none shadow-none hover:shadow-none" 
                href="/news/" 
                size="md"
              >
                Latest updates
              </Button>
              <Button
                className="border border-white/30 bg-white/12 text-white hover:bg-white hover:text-black transition-colors duration-200"
                href="/match-coverage/"
                size="md"
                variant="secondary"
              >
                Archive
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side — Lead Story Card */}
        <div className="flex flex-col justify-center bg-[#18181b] p-6 sm:p-12 lg:p-16 text-white border-t lg:border-t-0 lg:border-l border-white/10">
          {leadStory ? (
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                  {leadStory.label}
                </p>
              </div>
              <h2 className="mt-4 text-xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                {leadStory.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400 line-clamp-3">
                {leadStory.excerpt}
              </p>
              <div className="mt-8">
                <Button
                  href={leadStory.href}
                  rel={leadStory.isExternal ? "noreferrer" : undefined}
                  size="md"
                  target={leadStory.isExternal ? "_blank" : undefined}
                  className="w-full bg-[#ff6d00] hover:bg-[#e05f00] text-white border-none shadow-none hover:shadow-none"
                >
                  Full report
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-neutral-500 py-10">
              No featured match report at the moment.
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
