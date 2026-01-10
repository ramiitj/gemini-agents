import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, Eye, Users, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">

        {/* Main headline */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Evolve your product,{" "}
          <span className="text-primary">together</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
          Every team member experiments with their ideas in real-time. 
          See production-ready previews before sharing with your team.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/auth">
            <Button size="lg" className="gap-2 px-8">
              Start building free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8"
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            See how it works
          </Button>
        </div>

        {/* Process preview - 4 steps */}
        <div className="mt-16 flex items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Lightbulb className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Experiment</span>
          </div>
          <div className="h-px w-4 sm:w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Eye className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Preview</span>
          </div>
          <div className="h-px w-4 sm:w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Users className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Share</span>
          </div>
          <div className="h-px w-4 sm:w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Rocket className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Ship</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
