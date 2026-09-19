import React, { useRef } from 'react';
import { motion, useInView, Variant, useReducedMotion } from 'motion/react';

export interface InViewProps {
  children: React.ReactNode;
  variants?: {
    hidden: Variant;
    visible: Variant;
  };
  transition?: any;
  viewOptions?: Parameters<typeof useInView>[1];
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

const defaultVariants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

export const InView: React.FC<InViewProps> = ({
  children,
  variants = defaultVariants,
  transition = { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  viewOptions = { once: true, margin: '0px 0px -40px 0px' as any },
  as = 'div',
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, viewOptions as any);
  const shouldReduceMotion = useReducedMotion();

  const MotionComponent = motion[as] as any;

  if (shouldReduceMotion) {
    const Component = as;
    return <Component className={className}>{children}</Component>;
  }

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      transition={transition}
      className={className}
    >
      {children}
    </MotionComponent>
  );
};
