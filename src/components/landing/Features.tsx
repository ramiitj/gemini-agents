import { MessageSquare, Eye, GitPullRequest, Users } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Chat to Code",
    description:
      "Describe what you want in plain English. Our AI understands context and generates minimal, clean code changes.",
  },
  {
    icon: Eye,
    title: "Instant Previews",
    description:
      "See your changes live before committing. Every edit triggers a preview deployment so you know exactly what you're shipping.",
  },
  {
    icon: GitPullRequest,
    title: "One-Click Deploy",
    description:
      "When you're happy with the preview, approve it. We handle the git commit, push, and pull request automatically.",
  },
  {
    icon: Users,
    title: "Team Workflows",
    description:
      "Set up approval chains. Designers, developers, and PMs can all contribute and review before anything goes live.",
  },
];

interface FeaturesProps {
  id?: string;
}

const Features = ({ id }: FeaturesProps) => {
  return (
    <section id={id} className="px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to ship faster
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From idea to production in minutes, not days. Product Compass 
            handles the technical complexity so you can focus on what matters.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:gap-12">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
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
