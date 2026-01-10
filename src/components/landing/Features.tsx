import { MessageSquare, Eye, GitPullRequest, Users, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Natural Language to Code",
    description:
      "Describe what you want in plain English. Our AI understands context, analyzes your codebase, and generates clean, minimal changes.",
    benefit: "No coding required",
  },
  {
    icon: Eye,
    title: "Live Previews",
    description:
      "See your changes rendered instantly before committing. Every edit triggers a preview deployment so you know exactly what you're shipping.",
    benefit: "Instant feedback",
  },
  {
    icon: GitPullRequest,
    title: "One-Click Deploy",
    description:
      "When you're happy with the preview, approve it. We handle the git commit, push, and pull request creation automatically.",
    benefit: "Zero DevOps",
  },
  {
    icon: Users,
    title: "Team Workflows",
    description:
      "Set up approval chains. Designers, developers, and PMs can all contribute, review, and comment before anything goes live.",
    benefit: "Built for teams",
  },
  {
    icon: Zap,
    title: "Context-Aware AI",
    description:
      "Upload screenshots, reference existing code, or describe visual changes. The AI understands your entire project context.",
    benefit: "Smart suggestions",
  },
  {
    icon: Shield,
    title: "Version Control Built-in",
    description:
      "Every change is tracked. Undo mistakes instantly, compare versions, and maintain a complete history of your project evolution.",
    benefit: "Never lose work",
  },
];

interface FeaturesProps {
  id?: string;
}

const Features = ({ id }: FeaturesProps) => {
  return (
    <section id={id} className="border-t border-border px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to ship faster
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From idea to production in minutes, not days. No complex setup, no learning curve.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
                  <feature.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {feature.benefit}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
