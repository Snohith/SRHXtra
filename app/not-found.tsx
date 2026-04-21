import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function NotFound() {
  return (
    <section className="page-stack">
      <SectionHeader
        eyebrow="404"
        title="Page not found"
        description="This route is not part of the exported SRHXtra build. Head back to the home page or one of the main archives."
      />
      <div className="flex flex-wrap gap-3">
        <Button href="/">Home</Button>
        <Button href="/news/" variant="secondary">
          News
        </Button>
      </div>
    </section>
  );
}
