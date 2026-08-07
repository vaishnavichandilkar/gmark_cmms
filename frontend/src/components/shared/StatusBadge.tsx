import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'critical';
  pulse?: boolean;
}

export function StatusBadge({ status, pulse = true }: StatusBadgeProps) {
  const baseClasses = "h-3 w-3 rounded-full flex-shrink-0";
  
  const variants = {
    healthy: "bg-healthy shadow-glow-healthy",
    warning: "bg-warning shadow-glow-warning",
    critical: "bg-critical shadow-glow-critical",
  };

  return (
    <div className="relative flex items-center justify-center">
      {pulse && (
        <motion.div
          animate={{
            scale: [1, 2, 2],
            opacity: [1, 0, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn("absolute rounded-full", variants[status], "opacity-50 h-full w-full")}
        />
      )}
      <div className={cn(baseClasses, variants[status])} />
    </div>
  );
}
