import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        {/* Simple text badge */}
        <p className="mb-6 text-sm text-muted-foreground">
          AI-powered product development
        </p>

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
