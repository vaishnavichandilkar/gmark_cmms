import React, { useId } from 'react';
import { motion } from 'framer-motion';

export const PipeTest = () => {
  const d = "M 50 200 L 50 50 A 20 20 0 0 1 70 30 L 400 30";
  const pathId = useId();

  return (
    <div style={{ width: '500px', height: '300px', backgroundColor: '#f0f0f0', position: 'relative' }}>
      <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
        <defs>
          <path id={pathId} d={d} fill="none" />
        </defs>

        {/* --- Pipe Casing (3D effect) --- */}
        <path d={d} stroke="#64748b" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke="#94a3b8" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke="#cbd5e1" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* --- Fluid (3D effect) --- */}
        <path d={d} stroke="#1e40af" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke="#2563eb" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke="#eff6ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        <text fontSize="14" fill="#ffffff" fontWeight="bold">
          <motion.textPath 
            href={`#${pathId}`} 
            initial={{ startOffset: 0 }}
            animate={{ startOffset: 100 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            {"➤ \u00A0\u00A0\u00A0\u00A0\u00A0 ➤ \u00A0\u00A0\u00A0\u00A0\u00A0 ➤"}
          </motion.textPath>
        </text>
      </svg>
    </div>
  );
};
