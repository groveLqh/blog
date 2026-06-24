import { motion, type HTMLMotionProps, type Variants } from "framer-motion";

interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  duration?: number;
  yOffset?: number;
}

export function FadeIn({
  children,
  delay = 0,
  duration,
  yOffset,
  className,
  ...props
}: FadeInProps) {
  const customVariants: Variants = {
    hidden: {
      opacity: 0,
      y: yOffset ?? 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay,
        duration: duration ?? 0.5,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <motion.div
      variants={customVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
