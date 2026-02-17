// Network types (CAIP-2 format)
export type EvmNetwork = "eip155:8453";
export type SolanaNetwork = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export type Network = EvmNetwork | SolanaNetwork;

export const NUMERIC_CONSTANTS = {
  MAX_DELAY: 1000,
  validationLimits: {
    minStringLength: 1,
  },
  pagination: {
    minLimit: 1,
    maxLimit: 100,
    defaultLimit: 20,
  },
  swipe: {
    // Thresholds
    horizontalThreshold: 150,
    velocityThreshold: 500,
    // Exit
    exitDistance: 1000,
    exitScale: 0.8,
    // Drag
    dragElasticity: 0.7,
    scaleOnDrag: 1.05,
    // Stack (subtle differences so cards don't show through)
    stackScaleFactor: 0.03,
    stackOpacityFactor: 0.08,
    stackYOffset: 10,
    maxVisibleCards: 3,
    // Spring physics (velocity-based)
    spring: {
      exit: { stiffness: 600, damping: 30 },
      snapBack: { stiffness: 400, damping: 25 },
      stack: { stiffness: 300, damping: 28 },
      overlay: { stiffness: 350, damping: 22 },
    },
    // Overlay configuration
    overlay: {
      maxHeight: 0.85,
      dragCloseThreshold: 100,
      velocityCloseThreshold: 300,
    },
    // Haptic patterns (ms)
    haptic: {
      threshold: 10,
      swipeComplete: 20,
      error: [50, 30, 50] as number[],
    },
    // Button styling
    buttonSize: 60,
    buttonScale: 1.1,
    iconSize: 32,
    iconStrokeWidth: 2.5,
    transitionDuration: 0.2,
    disabledOpacity: 0.5,
    emptyStateHeight: 400,
  },
};
