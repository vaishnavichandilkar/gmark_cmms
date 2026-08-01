import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Tank } from './Tank';
import { PumpUnit } from './PumpUnit';

interface PipeProps {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  path?: string;
  flowDirection?: 'forward' | 'backward' | 'none';
  hasFault?: boolean;
  capStyle?: 'round' | 'butt' | 'square';
}

export const Pipe: React.FC<PipeProps> = ({ x1 = 0, y1 = 0, x2 = 0, y2 = 0, path, flowDirection = 'forward', hasFault = false, capStyle = 'round' }) => {
  const isFlowing = flowDirection !== 'none';
  const flowColor = hasFault ? '#FF453A' : '#14b8a6'; // Changed to match new Teal theme
  const strokeDasharray = "6 12";
  const animateTo = flowDirection === 'forward' ? -36 : flowDirection === 'backward' ? 36 : 0;
  
  const d = path || `M ${x1} ${y1} L ${x2} ${y2}`;

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
      {/* Acrylic outer wall (specular edge reflection) */}
      <path 
        d={d}
        stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
      />
      {/* Acrylic body core (refracted dark glass) */}
      <path 
        d={d}
        stroke="rgba(10,10,12,0.6)" strokeWidth="12" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
      />
      
      {/* Liquid core back blur / glow (slowly pulsing) */}
      <motion.path 
        d={d}
        stroke={flowColor} strokeWidth="8" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
        className="blur-[4px] transition-opacity duration-300"
        strokeDasharray={strokeDasharray}
        initial={{ strokeDashoffset: 0, opacity: 0.08 }}
        animate={isFlowing ? { 
          strokeDashoffset: animateTo,
          opacity: [0.15, 0.35, 0.15]
        } : { opacity: 0.08 }}
        transition={isFlowing ? { 
          strokeDashoffset: { duration: 1.2, repeat: Infinity, ease: "linear" },
          opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        } : {}}
      />

      {/* Inner flowing water particles (sharp stream) */}
      <motion.path 
        d={d}
        stroke={flowColor} strokeWidth="3" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
        className={`transition-opacity duration-300 ${isFlowing ? 'opacity-80' : 'opacity-10'}`}
        strokeDasharray={strokeDasharray}
        initial={{ strokeDashoffset: 0 }}
        animate={isFlowing ? { strokeDashoffset: animateTo } : {}}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />

      {/* Specular central reflection line (creates cylindrical shine) */}
      <path 
        d={d}
        stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
      />
    </svg>
  );
};

export interface PumpState {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'FAULT' | 'WARNING' | 'OFF';
  currentR: number;
  currentY: number;
  currentB: number;
  mode: 'AUTO' | 'MANUAL' | 'OFF';
  runOnTime: string;
  faults: number;
  isVisible: boolean;
}

export interface DashboardState {
  averageVoltage: number;
  ryVoltage: number;
  ybVoltage: number;
  rbVoltage: number;
  pressureBar: number;
  transmitterConnected: boolean;
  waterAvailable: boolean;
  deviceActive: boolean;
  inputPowerFaultType: number;
  pumpOnDelay: number;
  nextFillingTime: number;
  overloadResetDelay: number;
  underloadResetDelay: number;
  vfdResetAfter: number;
}

export interface ProcessFlowContainerProps {
  pumps: PumpState[];
  dashboardData: DashboardState;
  inletTankTitle?: string;
  outletTitle?: string;
  outletType?: 'label' | 'tank';
}

export const ProcessFlowContainer: React.FC<ProcessFlowContainerProps> = ({ 
  pumps, 
  dashboardData, 
  inletTankTitle = 'Underground Tank', 
  outletTitle = 'OUTLET', 
  outletType = 'label' 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const visiblePumps = pumps.filter(p => p.isVisible);
  const hasFlow = visiblePumps.some(p => p.status === 'RUNNING');

  const pumpSpacing = 270;
  const isTankOutlet = outletType === 'tank';
  const leftTankLeft = 20;
  const leftTankCenter = leftTankLeft + 64;

  const pumpLefts = visiblePumps.map((_, idx) => leftTankLeft + 155 + (idx * pumpSpacing));
  const pumpCenters = pumpLefts.map(left => left + 130);

  const numPumps = visiblePumps.length || 1; 
  let rightTankLeft = leftTankLeft + 155 + (numPumps * pumpSpacing) + 17;
  let outletEndX = rightTankLeft + 2;
  const canvasWidth = rightTankLeft + (isTankOutlet ? 150 : 100);

  const tankBottomY = 550;
  const manifoldY = isTankOutlet ? 85 : 55;

  return (
    <div className="relative w-full h-[760px] liquid-glass rounded-[24px] p-6 flex items-center overflow-hidden">
      <div
        ref={scrollRef}
        className={`w-full overflow-x-auto pb-2 custom-scrollbar relative h-full flex ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div style={{ minWidth: `${canvasWidth}px`, width: `${canvasWidth}px`, height: '100%', position: 'relative', margin: '0 auto' }}>
          {/* Draw Pipes via absolute overlay */}
          <div className="absolute inset-0 z-0">
            <div className="absolute text-[10px] text-gray-400 font-bold whitespace-nowrap leading-tight text-left z-0" style={{ left: `${leftTankCenter + 16}px`, top: '560px' }}>FROM<br />TANK</div>

            {visiblePumps.length > 0 && (
              <>
                <Pipe
                  path={`M ${leftTankCenter} ${tankBottomY} L ${leftTankCenter} ${680 - 16} A 16 16 0 0 0 ${leftTankCenter + 16} 680 L ${visiblePumps.length === 1 ? pumpCenters[0] - 16 : pumpCenters[0]} 680`}
                  flowDirection={hasFlow ? 'forward' : 'none'}
                />

                {visiblePumps.map((p, i) => {
                  const isRunning = p.status === 'RUNNING';
                  const isLast = i === visiblePumps.length - 1;
                  return (
                    <React.Fragment key={`inlet-pipe-vert-${p.id}`}>
                      {isLast ? (
                        <Pipe path={`M ${pumpCenters[i] - 16} 680 A 16 16 0 0 0 ${pumpCenters[i]} ${680 - 16} L ${pumpCenters[i]} 585`} flowDirection={isRunning ? 'forward' : 'none'} />
                      ) : (
                        <Pipe path={`M ${pumpCenters[i]} 680 L ${pumpCenters[i]} 585`} flowDirection={isRunning ? 'forward' : 'none'} capStyle="butt" />
                      )}
                    </React.Fragment>
                  );
                })}

                {visiblePumps.map((p, i) => {
                  const isLast = i === visiblePumps.length - 1;
                  const nextRunning = visiblePumps.slice(i + 1).some(op => op.status === 'RUNNING');
                  return (
                    <React.Fragment key={`inlet-pipe-horiz-${p.id}`}>
                      {!isLast && (
                        <Pipe path={`M ${pumpCenters[i]} 680 L ${i + 1 === visiblePumps.length - 1 ? pumpCenters[i + 1] - 16 : pumpCenters[i + 1]} 680`} flowDirection={nextRunning ? 'forward' : 'none'} />
                      )}
                    </React.Fragment>
                  );
                })}

                {visiblePumps.map((p, i) => {
                  const isRunning = p.status === 'RUNNING';
                  return (
                    <React.Fragment key={`outlet-pipe-vert-${p.id}`}>
                      {i === 0 ? (
                        <Pipe path={`M ${pumpCenters[i]} 145 L ${pumpCenters[i]} ${manifoldY + 16} A 16 16 0 0 1 ${pumpCenters[i] + 16} ${manifoldY}`} flowDirection={isRunning ? 'forward' : 'none'} />
                      ) : (
                        <Pipe path={`M ${pumpCenters[i]} 145 L ${pumpCenters[i]} ${manifoldY}`} flowDirection={isRunning ? 'forward' : 'none'} capStyle="butt" />
                      )}
                    </React.Fragment>
                  );
                })}

                {visiblePumps.map((p, i) => {
                  const isLast = i === visiblePumps.length - 1;
                  const currentOrPrevRunning = visiblePumps.slice(0, i + 1).some(op => op.status === 'RUNNING');
                  return (
                    <React.Fragment key={`outlet-pipe-horiz-${p.id}`}>
                      <Pipe
                        path={`M ${i === 0 ? pumpCenters[i] + 16 : pumpCenters[i]} ${manifoldY} L ${isLast ? (isTankOutlet ? rightTankLeft + 64 - 16 : outletEndX) : pumpCenters[i + 1]} ${manifoldY}`}
                        flowDirection={currentOrPrevRunning ? 'forward' : 'none'}
                      />
                    </React.Fragment>
                  );
                })}

                {isTankOutlet && (
                  <Pipe
                    path={`M ${rightTankLeft + 64 - 16} ${manifoldY} A 16 16 0 0 1 ${rightTankLeft + 64} ${manifoldY + 16} L ${rightTankLeft + 64} ${manifoldY + 55}`}
                    flowDirection={hasFlow ? 'forward' : 'none'}
                  />
                )}
              </>
            )}
          </div>

          <div className="absolute z-10" style={{ left: `${leftTankLeft}px`, top: '285px' }}>
            <Tank level={dashboardData.waterAvailable ? 100 : 0} title={inletTankTitle} />
          </div>

          {isTankOutlet ? (
            <>
              <div className="absolute z-10 w-32 flex justify-center text-center" style={{ left: `${rightTankLeft}px`, top: '45px' }}>
                <h3 className="text-white text-xs font-bold tracking-widest uppercase leading-tight">
                  {outletTitle.split(' ').map((word: string, index: number) => (
                    <React.Fragment key={index}>
                      {word}
                      {index < outletTitle.split(' ').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h3>
              </div>
              <div className="absolute z-10" style={{ left: `${rightTankLeft}px`, top: '110px' }}>
                <Tank level={75} title="" />
              </div>
            </>
          ) : (
            <div className="absolute top-[55px] z-10 -translate-y-1/2 flex items-center" style={{ left: `${outletEndX + 10}px` }}>
              <h3 className="text-white text-xs font-bold tracking-widest uppercase whitespace-nowrap">{outletTitle}</h3>
            </div>
          )}

          {visiblePumps.map((p, idx) => (
            <div key={p.id} className="absolute top-[145px] z-10" style={{ left: `${pumpLefts[idx]}px` }}>
              <PumpUnit
                name={p.name}
                status={p.status}
                currentR={p.currentR}
                currentY={p.currentY}
                currentB={p.currentB}
                mode={p.mode}
                runOnTime={p.runOnTime}
              />
            </div>
          ))}

          {visiblePumps.length === 0 && (
            <div
              className="absolute z-10 flex items-center justify-center pointer-events-none"
              style={{
                left: `${leftTankLeft + 155}px`,
                top: '145px',
                width: '260px',
                height: '350px'
              }}
            >
              <div className="bg-[#0f172a]/80 px-6 py-6 rounded-[24px] border border-white/10 text-[rgba(255,255,255,0.45)] font-bold text-[14px] uppercase tracking-widest text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
                No Pumps Configured in Panel
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
