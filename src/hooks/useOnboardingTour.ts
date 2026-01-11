import { useState, useEffect, useCallback } from "react";

interface TourState {
  hasSeenDashboardTour: boolean;
  hasSeenProjectTour: boolean;
  lastSeenAt: string | null;
}

const TOUR_STORAGE_KEY = "holocron-onboarding-tour";

const getDefaultState = (): TourState => ({
  hasSeenDashboardTour: false,
  hasSeenProjectTour: false,
  lastSeenAt: null,
});

export function useOnboardingTour() {
  const [tourState, setTourState] = useState<TourState>(getDefaultState);
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  const [showProjectTour, setShowProjectTour] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOUR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TourState;
        setTourState(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save state to localStorage whenever it changes
  const saveState = useCallback((newState: TourState) => {
    setTourState(newState);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const startDashboardTour = useCallback(() => {
    if (!tourState.hasSeenDashboardTour) {
      setShowDashboardTour(true);
    }
  }, [tourState.hasSeenDashboardTour]);

  const startProjectTour = useCallback(() => {
    if (!tourState.hasSeenProjectTour) {
      setShowProjectTour(true);
    }
  }, [tourState.hasSeenProjectTour]);

  const completeDashboardTour = useCallback(() => {
    setShowDashboardTour(false);
    saveState({
      ...tourState,
      hasSeenDashboardTour: true,
      lastSeenAt: new Date().toISOString(),
    });
  }, [tourState, saveState]);

  const completeProjectTour = useCallback(() => {
    setShowProjectTour(false);
    saveState({
      ...tourState,
      hasSeenProjectTour: true,
      lastSeenAt: new Date().toISOString(),
    });
  }, [tourState, saveState]);

  const resetTours = useCallback(() => {
    saveState(getDefaultState());
    setShowDashboardTour(false);
    setShowProjectTour(false);
  }, [saveState]);

  return {
    // State
    hasSeenDashboardTour: tourState.hasSeenDashboardTour,
    hasSeenProjectTour: tourState.hasSeenProjectTour,
    showDashboardTour,
    showProjectTour,
    
    // Actions
    startDashboardTour,
    startProjectTour,
    completeDashboardTour,
    completeProjectTour,
    resetTours,
    
    // For manual close
    setShowDashboardTour,
    setShowProjectTour,
  };
}
