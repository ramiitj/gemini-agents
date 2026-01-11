import Joyride, { CallBackProps, Step, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { useTheme } from "next-themes";

interface WelcomeTourProps {
  run: boolean;
  steps: Step[];
  onComplete: () => void;
  onSkip?: () => void;
}

const WelcomeTour = ({ run, steps, onComplete, onSkip }: WelcomeTourProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleCallback = (data: CallBackProps) => {
    const { status, action, type } = data;
    
    // Tour finished (completed or skipped)
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (action === ACTIONS.SKIP && onSkip) {
        onSkip();
      } else {
        onComplete();
      }
    }
    
    // Handle close button click
    if (type === EVENTS.TOUR_END) {
      onComplete();
    }
  };

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      disableOverlayClose
      callback={handleCallback}
      styles={{
        options: {
          arrowColor: isDark ? "hsl(240 3.7% 15.9%)" : "hsl(0 0% 100%)",
          backgroundColor: isDark ? "hsl(240 3.7% 15.9%)" : "hsl(0 0% 100%)",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          primaryColor: "hsl(262.1 83.3% 57.8%)", // primary color
          textColor: isDark ? "hsl(0 0% 98%)" : "hsl(240 10% 3.9%)",
          spotlightShadow: "0 0 20px rgba(147, 51, 234, 0.3)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "20px",
          fontSize: "14px",
        },
        tooltipTitle: {
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "8px",
        },
        tooltipContent: {
          padding: "8px 0",
          lineHeight: 1.5,
        },
        buttonNext: {
          backgroundColor: "hsl(262.1 83.3% 57.8%)",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 500,
          padding: "8px 16px",
        },
        buttonBack: {
          color: isDark ? "hsl(0 0% 63.9%)" : "hsl(240 3.8% 46.1%)",
          fontSize: "14px",
          marginRight: "8px",
        },
        buttonSkip: {
          color: isDark ? "hsl(0 0% 63.9%)" : "hsl(240 3.8% 46.1%)",
          fontSize: "13px",
        },
        beacon: {
          display: "none", // Hide beacon, use spotlight only
        },
        spotlight: {
          borderRadius: "8px",
        },
      }}
      locale={{
        back: "Back",
        close: "Got it",
        last: "Let's go!",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
};

export default WelcomeTour;

// Dashboard tour steps
export const dashboardTourSteps: Step[] = [
  {
    target: "[data-tour='sidebar']",
    content: "Navigate between your projects, settings, and team members from here. You can collapse this sidebar anytime.",
    title: "👋 Welcome to GetHolocron!",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: "[data-tour='org-switcher']",
    content: "Switch between different workspaces or create new ones. Each workspace can have its own projects and team members.",
    title: "Workspace Switcher",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='new-project']",
    content: "Create your first project to start building. Connect a GitHub repository to enable AI-powered code editing and automatic deployments.",
    title: "Create Projects",
    placement: "bottom-end",
    disableBeacon: true,
  },
  {
    target: "[data-tour='project-grid']",
    content: "Your projects appear here as cards. Click any project to open the AI workspace and start building!",
    title: "Your Projects",
    placement: "top",
    disableBeacon: true,
  },
];

// Project workspace tour steps
export const projectTourSteps: Step[] = [
  {
    target: "[data-tour='chat-panel']",
    content: "Describe what you want to build using natural language. The AI agent understands your intent and writes the code for you.",
    title: "🤖 AI Agent",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: "[data-tour='mode-toggle']",
    content: "Switch between modes: Chat for discussions, Execute for code changes, Web Search for research, Images for visual inspiration, and Design for UI prototypes.",
    title: "Agent Modes",
    placement: "top",
    disableBeacon: true,
  },
  {
    target: "[data-tour='preview-panel']",
    content: "See your changes in real-time as the AI builds. Click any element to select it and ask the AI to modify it directly.",
    title: "Live Preview",
    placement: "left",
    disableBeacon: true,
  },
  {
    target: "[data-tour='team-panel']",
    content: "Collaborate with your team through comments and discussions. Share feedback on changes and coordinate work together.",
    title: "Team Collaboration",
    placement: "left",
    disableBeacon: true,
  },
];
