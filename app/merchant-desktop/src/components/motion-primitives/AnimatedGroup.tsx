import React, { Children, isValidElement } from 'react';
import { motion, Variants, useReducedMotion } from 'motion/react';

export type PresetType = 'fade' | 'slide' | 'scale' | 'blur' | 'blur-slide';

export interface AnimatedGroupProps {
  children: React.ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  preset?: PresetType;
  as?: keyof React.JSX.IntrinsicElements;
  asChild?: keyof React.JSX.IntrinsicElements;
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const presetVariants: Record<PresetType, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  },
  slide: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.94 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(8px)' },
    visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.4, ease: 'easeOut' } },
  },
  'blur-slide': {
    hidden: { opacity: 0, filter: 'blur(6px)', y: 12 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  },
};

export const AnimatedGroup: React.FC<AnimatedGroupProps> = ({
  children,
  className,
  variants,
  preset = 'blur-slide',
  as = 'div',
  asChild = 'div',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const selectedItemVariants = variants?.item || presetVariants[preset];
  const containerVariants = variants?.container || defaultContainerVariants;

  const MotionContainer = motion[as] as any;
  const MotionChild = motion[asChild] as any;

  if (shouldReduceMotion) {
    const Component = as;
    return <Component className={className}>{children}</Component>;
  }

  return (
    <MotionContainer
      className={className}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        return (
          <MotionChild key={index} variants={selectedItemVariants}>
            {child}
          </MotionChild>
        );
      })}
    </MotionContainer>
  );
};
