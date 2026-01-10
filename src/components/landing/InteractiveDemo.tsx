import { useState, useEffect } from "react";
import { Lightbulb, Eye, Users, Rocket, Search, Image, MessageSquare, Check, Bell } from "lucide-react";

const steps = [
  {
    id: "experiment",
    label: "Experiment",
    icon: Lightbulb,
    description: "Research with integrated web and image search. The AI uses real sources to ground every suggestion.",
  },
  {
    id: "preview",
    label: "Preview",
    icon: Eye,
    description: "See your changes live instantly. No staging servers—exactly what users will see.",
  },
  {
    id: "share",
    label: "Share",
    icon: Users,
    description: "Happy with your preview? Share it with your team in one click. They see your vision, not just a description.",
  },
  {
    id: "ship",
    label: "Ship",
    icon: Rocket,
    description: "Team approved? Ship it. Git commits, branches, and PRs happen automatically.",
  },
];

const ExperimentMockup = () => (
  <div className="flex gap-3 h-full animate-fade-in">
    {/* Chat Panel */}
    <div className="flex-1 rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
      <div className="text-xs font-medium text-muted-foreground mb-1">Chat</div>
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageSquare className="h-3 w-3 text-primary" />
        </div>
        <div className="flex-1 rounded-lg bg-muted p-2 text-xs">
          Add a dark mode toggle to settings
        </div>
      </div>
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: "0.6s" }}>
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
          <Lightbulb className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex-1 rounded-lg bg-primary/10 p-2 text-xs">
          I'll add a theme toggle using your existing design system...
        </div>
      </div>
    </div>
    {/* Search Panel */}
    <div className="w-2/5 rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
      <div className="text-xs font-medium text-muted-foreground mb-1">Research</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <Search className="h-3 w-3" />
        <span>tailwind dark mode</span>
      </div>
      <div className="rounded border border-border p-2 text-xs bg-muted/50 animate-fade-in" style={{ animationDelay: "0.8s" }}>
        <div className="font-medium">Tailwind CSS Docs</div>
        <div className="text-muted-foreground truncate">Dark mode using class strategy...</div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "1s" }}>
        <Image className="h-3 w-3" />
        <span>UI references</span>
      </div>
      <div className="flex gap-1 animate-fade-in" style={{ animationDelay: "1.2s" }}>
        <div className="h-8 w-8 rounded bg-muted" />
        <div className="h-8 w-8 rounded bg-muted" />
        <div className="h-8 w-8 rounded bg-muted" />
      </div>
    </div>
  </div>
);

const PreviewMockup = () => {
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDeployed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full flex flex-col gap-3 animate-fade-in">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div 
            className={`h-full bg-primary transition-all duration-1000 ease-out ${deployed ? 'w-full' : 'w-1/3'}`}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {deployed ? "Ready" : "Deploying..."}
        </span>
      </div>
      {/* Browser mockup */}
      <div className={`flex-1 rounded-lg border border-border bg-card overflow-hidden transition-opacity duration-500 ${deployed ? 'opacity-100' : 'opacity-50'}`}>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b border-border">
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex-1 text-center text-xs text-muted-foreground">
            preview-abc123.vercel.app
          </div>
        </div>
        <div className="p-4 flex flex-col items-center justify-center h-32">
          {deployed ? (
            <div className="animate-scale-in text-center">
              <div className="text-sm font-medium mb-2">Settings</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Dark mode</span>
                <div className="h-5 w-9 rounded-full bg-primary flex items-center justify-end px-0.5">
                  <div className="h-4 w-4 rounded-full bg-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">Building preview...</div>
          )}
        </div>
      </div>
    </div>
  );
};

const ShareMockup = () => {
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShared(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 animate-fade-in">
      {/* Share dialog */}
      <div className="w-full max-w-xs rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="text-sm font-medium mb-3">Share with Team</div>
        <div className="text-xs text-muted-foreground mb-3">
          "Added dark mode toggle to settings page"
        </div>
        <div className="flex items-center gap-2 text-xs text-primary mb-4">
          <Eye className="h-3 w-3" />
          <span>preview-abc123.vercel.app</span>
        </div>
        <button 
          className={`w-full py-2 rounded-md text-xs font-medium transition-all ${
            shared 
              ? 'bg-primary/20 text-primary' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {shared ? "Shared!" : "Share Preview"}
        </button>
      </div>
      {/* Notification */}
      {shared && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
          <Bell className="h-3 w-3" />
          <span>Sarah, Mike notified</span>
        </div>
      )}
    </div>
  );
};

const ShipMockup = () => {
  const [approvals, setApprovals] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setApprovals(1), 600);
    const timer2 = setTimeout(() => setApprovals(2), 1200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 animate-fade-in">
      {/* Approvals */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <div className={`flex items-center gap-2 text-sm transition-opacity ${approvals >= 1 ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${approvals >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {approvals >= 1 && <Check className="h-3 w-3 animate-scale-in" />}
          </div>
          <span>Sarah approved</span>
        </div>
        <div className={`flex items-center gap-2 text-sm transition-opacity ${approvals >= 2 ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${approvals >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {approvals >= 2 && <Check className="h-3 w-3 animate-scale-in" />}
          </div>
          <span>Mike approved</span>
        </div>
      </div>
      {/* Ship banner */}
      {approvals >= 2 && (
        <div className="mt-4 rounded-lg border border-primary/50 bg-primary/10 px-6 py-3 animate-scale-in">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Rocket className="h-4 w-4" />
            Shipped to Production
          </div>
          <div className="text-xs text-muted-foreground mt-1">yourapp.com</div>
        </div>
      )}
    </div>
  );
};

const InteractiveDemo = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((step) => (step + 1) % 4);
          return 0;
        }
        return prev + 2;
      });
    }, 80);

    return () => clearInterval(progressInterval);
  }, []);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setProgress(0);
  };

  const renderMockup = () => {
    switch (activeStep) {
      case 0:
        return <ExperimentMockup key="experiment" />;
      case 1:
        return <PreviewMockup key="preview" />;
      case 2:
        return <ShareMockup key="share" />;
      case 3:
        return <ShipMockup key="ship" />;
      default:
        return null;
    }
  };

  return (
    <section className="border-t border-border px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Watch how a team member brings an idea to life
          </p>
        </div>

        {/* Step tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(index)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeStep === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <step.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.label}</span>
              {activeStep === index && (
                <div 
                  className="absolute bottom-0 left-0 h-0.5 bg-primary-foreground/50 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Mockup area */}
        <div className="rounded-xl border border-border bg-muted/30 p-6 min-h-[280px]">
          {renderMockup()}
        </div>

        {/* Step description */}
        <p className="mt-6 text-center text-muted-foreground">
          {steps[activeStep].description}
        </p>
      </div>
    </section>
  );
};

export default InteractiveDemo;
