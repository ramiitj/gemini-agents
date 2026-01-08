import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/30 to-transparent" />
      
      <div className="mx-auto max-w-3xl text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI-powered product development</span>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Build products with your team,{" "}
          <span className="text-primary">powered by AI</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
          Product Compass turns natural language into deployed code. Chat with AI, 
          preview changes instantly, and ship with team approval—all in one place.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="gap-2 px-8">
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="px-8">
            See how it works
          </Button>
        </div>

        {/* Social proof hint */}
        <p className="mt-10 text-sm text-muted-foreground">
          Trusted by product teams at fast-moving startups
        </p>
      </div>
    </section>
  );
};

export default Hero;
