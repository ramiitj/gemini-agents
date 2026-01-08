const steps = [
  {
    number: "1",
    title: "Connect your repo",
    description:
      "Link your GitHub repository and Vercel project. Takes less than a minute.",
  },
  {
    number: "2",
    title: "Describe what you want",
    description:
      "Tell the AI what to build or change in plain English. Upload screenshots for context.",
  },
  {
    number: "3",
    title: "Review the preview",
    description:
      "See a live preview of your changes. Request tweaks until it's perfect.",
  },
  {
    number: "4",
    title: "Approve and ship",
    description:
      "One click creates the PR and deploys. Team members can review and approve.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-muted/30 px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Four simple steps from idea to production
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-8 hidden h-px w-full bg-border lg:block" />
              )}
              
              <div className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
                {/* Step number */}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                  {step.number}
                </div>
                
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
