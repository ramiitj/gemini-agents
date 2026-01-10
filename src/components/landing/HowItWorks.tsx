import { GitBranch, MessageSquare, Eye, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: GitBranch,
    title: "Connect your repo",
    description:
      "Link your GitHub repository. We'll analyze your codebase and set up automatic deployments. Takes less than a minute.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Describe what you want",
    description:
      "Tell the AI what to build or change in plain English. Upload screenshots, reference components, or describe the visual outcome you need.",
  },
  {
    number: "03",
    icon: Eye,
    title: "Review live preview",
    description:
      "See a fully deployed preview of your changes instantly. Click on elements to request tweaks. Iterate until it's perfect.",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Approve and ship",
    description:
      "One click creates the PR and deploys to production. Share with your team for review, get approvals, and ship with confidence.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-muted/30 px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Four simple steps from idea to production
          </p>
        </div>

        {/* Steps - vertical timeline on mobile, horizontal on desktop */}
        <div className="mt-16 relative">
          {/* Connecting line - hidden on mobile */}
          <div className="absolute left-1/2 top-12 hidden h-px w-[calc(100%-12rem)] -translate-x-1/2 bg-border lg:block" />
          
          <div className="grid gap-12 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="flex flex-col items-center text-center">
                  {/* Step number circle */}
                  <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-bold text-primary shadow-sm">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <step.icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link to="/auth">
            <Button size="lg" className="gap-2 px-8">
              Get started now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Free to start. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
