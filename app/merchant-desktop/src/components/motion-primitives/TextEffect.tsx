import React from 'react';
import { motion, Variants, useReducedMotion } from 'motion/react';

export type TextEffectPer = 'word' | 'char' | 'line';
export type TextEffectPreset = 'fade' | 'slide' | 'scale' | 'blur';

export interface TextEffectProps {
  children: string;
  per?: TextEffectPer;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: TextEffectPreset;
  delay?: number;
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemPresets: Record<TextEffectPreset, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  },
  slide: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(6px)', y: 8 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  },
};

export const TextEffect: React.FC<TextEffectProps> = ({
  children,
  per = 'word',
  as = 'p',
  variants,
  className,
  preset = 'blur',
  delay = 0,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    const Component = as;
    return <Component className={className}>{children}</Component>;
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: per === 'word' ? 0.06 : 0.025,
        delayChildren: delay,
      },
    },
    ...variants?.container,
  };

  const itemVariants = variants?.item || itemPresets[preset];
  const MotionComponent = motion[as] as any;

  let tokens: string[] = [];
  if (per === 'word') {
    tokens = children.split(' ');
  } else if (per === 'char') {
    tokens = children.split('');
  } else {
    tokens = children.split('\n');
  }

  return (
    <MotionComponent
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
      aria-label={children}
    >
      {tokens.map((token, index) => (
        <span key={index} className="inline-block whitespace-pre">
          <motion.span variants={itemVariants} className="inline-block">
            {token}
          </motion.span>
          {per === 'word' && index < tokens.length - 1 ? ' ' : ''}
        </span>
      ))}
    </MotionComponent>
  );
};
