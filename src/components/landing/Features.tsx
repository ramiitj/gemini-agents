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
      <div className="mx-auto max-w-4xl">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Everything you need to ship faster
          </h2>
          <p className="mt-3 text-muted-foreground">
            From idea to production in minutes, not days.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border p-6 transition-colors hover:bg-muted/50"
            >
              <div className="mb-3 flex items-center gap-3">
                <feature.icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">
                  {feature.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
