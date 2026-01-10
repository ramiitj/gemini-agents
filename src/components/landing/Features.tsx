import { Search, Image, GitBranch, Users, Eye, Rocket } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Integrated Web & Image Search",
    description:
      "Research docs, competitors, and UI patterns while planning. Search results become context for AI, grounding every suggestion in real sources.",
    benefit: "Deep context",
  },
  {
    icon: GitBranch,
    title: "Your Private Experiment Space",
    description:
      "Try your ideas without affecting anyone else. See exactly how changes look in production before you share them with the team.",
    benefit: "Risk-free exploration",
  },
  {
    icon: Eye,
    title: "Live Production Previews",
    description:
      "Every change triggers an instant preview deployment. No staging servers, no waiting—see exactly what users will see.",
    benefit: "Real results",
  },
  {
    icon: Image,
    title: "Share When You're Ready",
    description:
      "Built your idea? Preview looks good? Share it with your team in one click. They see your vision, not just a description.",
    benefit: "Show, don't tell",
  },
  {
    icon: Users,
    title: "Team Reviews with Context",
    description:
      "Teammates see your live preview, comment, suggest changes. Everyone can iterate on actual working code, not mockups.",
    benefit: "Real collaboration",
  },
  {
    icon: Rocket,
    title: "One-Click to Production",
    description:
      "Approved by the team? Ship it. Git commits, branches, and PRs happen automatically.",
    benefit: "Zero DevOps",
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
            Think. Experiment. Share.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every team member gets their own space to try ideas and see them live—then share when ready.
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
