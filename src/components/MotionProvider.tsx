"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode, createContext, useContext } from "react";

// ============================================================================
// MOTION STANDARDS - HARD SYSTEM CONSTRAINTS
// Based on globals.css tokens:
// --duration-micro: 150ms  (Micro-interactions)
// --duration-fast: 250ms   (Button hovers, toggles)
// --duration-normal: 400ms (Panel transitions)
// --duration-slow: 800ms   (Page transitions)
// ============================================================================

export const DURATIONS = {
  micro: 0.15,   // 150ms - Micro-interactions
  fast: 0.25,    // 250ms - Button hovers, toggles
  normal: 0.4,   // 400ms - Panel transitions
  slow: 0.8,     // 800ms - Page transitions
} as const;

export const EASINGS = {
  // Standard easing curves
  default: [0.4, 0, 0.2, 1],      // ease-out
  enter: [0, 0, 0.2, 1],          // ease-out for entering
  exit: [0.4, 0, 1, 1],           // ease-in for exiting
  bounce: [0.68, -0.55, 0.265, 1.55],
  smooth: [0.25, 0.1, 0.25, 1],
} as const;

// ============================================================================
// PRESET ANIMATION VARIANTS
// ============================================================================

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: DURATIONS.normal, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0,
    transition: { duration: DURATIONS.fast, ease: EASINGS.exit }
  },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: DURATIONS.normal, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: DURATIONS.fast, ease: EASINGS.exit }
  },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: DURATIONS.normal, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: { duration: DURATIONS.fast, ease: EASINGS.exit }
  },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: DURATIONS.normal, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0, 
    x: -10,
    transition: { duration: DURATIONS.fast, ease: EASINGS.exit }
  },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: DURATIONS.normal, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0, 
    x: 10,
    transition: { duration: DURATIONS.fast, ease: EASINGS.exit }
  },
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: DURATIONS.fast, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: DURATIONS.micro, ease: EASINGS.exit }
  },
};

export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: DURATIONS.fast, ease: EASINGS.bounce }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: DURATIONS.micro, ease: EASINGS.exit }
  },
};

// Stagger container for lists
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

// Stagger item for list children
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: DURATIONS.fast, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0, 
    y: -5,
    transition: { duration: DURATIONS.micro, ease: EASINGS.exit }
  },
};

// Page transition
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: DURATIONS.slow, ease: EASINGS.smooth }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: DURATIONS.normal, ease: EASINGS.exit }
  },
};

// Panel/Modal transition
export const panelVariants: Variants = {
  hidden: { opacity: 0, x: -20, scale: 0.98 },
  visible: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { duration: DURATIONS.normal, ease: EASINGS.default }
  },
  exit: { 
    opacity: 0, 
    x: -10, 
    scale: 0.98,
    transition: { duration: DURATIONS.fast, ease: EASINGS.exit }
  },
};

// ============================================================================
// MOTION CONTEXT
// ============================================================================

interface MotionContextType {
  durations: typeof DURATIONS;
  easings: typeof EASINGS;
}

const MotionContext = createContext<MotionContextType>({
  durations: DURATIONS,
  easings: EASINGS,
});

export const useMotion = () => useContext(MotionContext);

// ============================================================================
// MOTION PROVIDER COMPONENT
// ============================================================================

interface MotionProviderProps {
  children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionContext.Provider value={{ durations: DURATIONS, easings: EASINGS }}>
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </MotionContext.Provider>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface AnimatedContainerProps {
  children: ReactNode;
  variants?: Variants;
  className?: string;
  delay?: number;
}

export function FadeIn({ 
  children, 
  className, 
  delay = 0 
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({ 
  children, 
  className, 
  delay = 0 
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={slideUpVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ 
  children, 
  className, 
  delay = 0 
}: AnimatedContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ 
  children, 
  className 
}: Omit<AnimatedContainerProps, 'delay'>) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className 
}: Omit<AnimatedContainerProps, 'delay'>) {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Hover animation wrapper
interface HoverProps {
  children: ReactNode;
  className?: string;
  scale?: number;
  y?: number;
}

export function Hover({ 
  children, 
  className, 
  scale = 1.02,
  y = -2 
}: HoverProps) {
  return (
    <motion.div
      whileHover={{ 
        scale, 
        y,
        transition: { duration: DURATIONS.micro, ease: EASINGS.default }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: DURATIONS.micro }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Button press animation
export function Pressable({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      whileTap={{ 
        scale: 0.97,
        transition: { duration: DURATIONS.micro }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Glow pulse animation for AI elements
export function GlowPulse({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          "0 0 10px rgba(255, 107, 107, 0.2)",
          "0 0 20px rgba(255, 107, 107, 0.4)",
          "0 0 10px rgba(255, 107, 107, 0.2)",
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Status indicator pulse
export function StatusPulse({ 
  color = "#FF6B6B",
  size = 8 
}: { 
  color?: string;
  size?: number;
}) {
  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
