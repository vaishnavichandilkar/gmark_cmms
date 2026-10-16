import React, { useRef, useState, useId } from 'react';
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
  hideBase?: boolean;
  hideAnimation?: boolean;
}

export const Pipe: React.FC<PipeProps> = ({ x1 = 0, y1 = 0, x2 = 0, y2 = 0, path, flowDirection = 'forward', hasFault = false, capStyle = 'round', hideBase = false, hideAnimation = false }) => {
  const isFlowing = flowDirection !== 'none';
  const pathId = useId();
  
  const d = path || `M ${x1} ${y1} L ${x2} ${y2}`;
  const isBackward = flowDirection === 'backward';

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
      <defs>
        <path id={pathId} d={d} fill="none" />
      </defs>

      {/* Blue Water Stream (3D Effect) */}
      {isFlowing && !hideBase && (
        <g>
          <path d={d} stroke="#1d4ed8" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d={d} stroke="#3b82f6" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d={d} stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}

      {/* Wave Particles (Flow Animation) */}
      {isFlowing && !hideAnimation && (
        <>
          <motion.path
            d={d}
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 22"
            initial={{ strokeDashoffset: isBackward ? 0 : 24 }}
            animate={{ strokeDashoffset: isBackward ? 24 : 0 }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
            fill="none"
            style={{ opacity: 0.8 }}
          />
          <motion.path
            d={d}
            stroke="#93c5fd"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2 30"
            initial={{ strokeDashoffset: isBackward ? 0 : 32 }}
            animate={{ strokeDashoffset: isBackward ? 32 : 0 }}
            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
            fill="none"
            style={{ opacity: 0.5 }}
          />
        </>
      )}
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

  const pumpSpacing = 500; // Increased spacing for proper gaps between horizontal pump cards
  const isTankOutlet = outletType === 'tank';
  const leftTankLeft = 60;
  const leftTankCenter = leftTankLeft + 64;

  const pumpLefts = visiblePumps.map((_, idx) => leftTankLeft + 240 + (idx * pumpSpacing));
  const pumpPipeXs = pumpLefts.map(left => left + 147); // Center of the pump's green body (top discharge flange)
  const pumpInletXs = pumpLefts.map(left => left - 40); // 40px gap outside the pump card

  const numPumps = visiblePumps.length || 1; 
  let rightTankLeft = leftTankLeft + 240 + (numPumps * pumpSpacing);
  let outletEndX = rightTankLeft + 60;
  const canvasWidth = Math.max(rightTankLeft + (isTankOutlet ? 180 : 150), 1000);

  const tankBottomY = 408;
  const manifoldY = 20;
  const bottomManifoldY = 560;

  const allPaths: string[] = [];
  if (visiblePumps.length > 0) {
    allPaths.push(`M ${leftTankCenter} ${tankBottomY} L ${leftTankCenter} ${bottomManifoldY - 16} A 16 16 0 0 0 ${leftTankCenter + 16} ${bottomManifoldY} L ${visiblePumps.length === 1 ? pumpInletXs[0] - 16 : pumpInletXs[0]} ${bottomManifoldY}`);
    visiblePumps.forEach((_, i) => {
      const isLast = i === visiblePumps.length - 1;
      if (isLast) {
        allPaths.push(`M ${pumpInletXs[i] - 16} ${bottomManifoldY} A 16 16 0 0 0 ${pumpInletXs[i]} ${bottomManifoldY - 16} L ${pumpInletXs[i]} 274 A 16 16 0 0 1 ${pumpInletXs[i] + 16} 258 L ${pumpLefts[i]} 258`);
      } else {
        allPaths.push(`M ${pumpInletXs[i]} ${bottomManifoldY} L ${pumpInletXs[i]} 274 A 16 16 0 0 1 ${pumpInletXs[i] + 16} 258 L ${pumpLefts[i]} 258`);
      }
      if (!isLast) {
        const nextX = i + 1 === visiblePumps.length - 1 ? pumpInletXs[i + 1] - 16 : pumpInletXs[i + 1];
        allPaths.push(`M ${pumpInletXs[i]} ${bottomManifoldY} L ${nextX} ${bottomManifoldY}`);
      }
    });
    visiblePumps.forEach((_, i) => {
      if (i === 0) {
        allPaths.push(`M ${pumpPipeXs[i]} 95 L ${pumpPipeXs[i]} ${manifoldY + 16} A 16 16 0 0 1 ${pumpPipeXs[i] + 16} ${manifoldY}`);
      } else {
        allPaths.push(`M ${pumpPipeXs[i]} 95 L ${pumpPipeXs[i]} ${manifoldY}`);
      }
    });
    visiblePumps.forEach((_, i) => {
      const isLast = i === visiblePumps.length - 1;
      const startX = i === 0 ? pumpPipeXs[i] + 16 : pumpPipeXs[i];
      const endX = isLast ? (isTankOutlet ? rightTankLeft + 64 - 16 : outletEndX) : pumpPipeXs[i + 1];
      allPaths.push(`M ${startX} ${manifoldY} L ${endX} ${manifoldY}`);
    });
    if (isTankOutlet) {
      allPaths.push(`M ${rightTankLeft + 64 - 16} ${manifoldY} A 16 16 0 0 1 ${rightTankLeft + 64} ${manifoldY + 16} L ${rightTankLeft + 64} ${manifoldY + 55}`);
    }
  }
  const combinedPath = allPaths.join(' ');

  return (
    <div className="scada-card relative w-full h-[660px] flex flex-col overflow-hidden">
      <div className="scada-card-title shrink-0">
        <h2>PUMPS OVERVIEW</h2>
      </div>

      <div
        ref={scrollRef}
        className={`w-full overflow-x-auto pb-2 custom-scrollbar relative flex-1 flex ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div style={{ minWidth: `${canvasWidth}px`, width: `${canvasWidth}px`, height: '100%', position: 'relative', margin: '0 auto' }}>
          {/* Draw Pipes via absolute overlay */}
          <div className="absolute inset-0 z-0">
            {/* Base Pipe Network rendered as a single path layer stack for perfect intersections */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
              <path d={combinedPath} stroke="#64748b" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d={combinedPath} stroke="#94a3b8" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d={combinedPath} stroke="#cbd5e1" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d={combinedPath} stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>

            <div className="absolute text-[10px] text-gray-500 font-bold whitespace-nowrap leading-tight text-left z-0" style={{ left: `${leftTankCenter + 16}px`, top: '450px' }}>FROM<br />TANK</div>

            {visiblePumps.length > 0 && (
              <>
                <Pipe
                  path={`M ${leftTankCenter} ${tankBottomY} L ${leftTankCenter} ${bottomManifoldY - 16} A 16 16 0 0 0 ${leftTankCenter + 16} ${bottomManifoldY} L ${visiblePumps.length === 1 ? pumpInletXs[0] - 16 : pumpInletXs[0]} ${bottomManifoldY}`}
                  flowDirection={hasFlow ? 'forward' : 'none'}
                />

                {visiblePumps.map((p, i) => {
                  const isRunning = p.status === 'RUNNING';
                  const isLast = i === visiblePumps.length - 1;
                  return (
                    <React.Fragment key={`inlet-pipe-vert-${p.id}`}>
                      {isLast ? (
                        <Pipe path={`M ${pumpInletXs[i] - 16} ${bottomManifoldY} A 16 16 0 0 0 ${pumpInletXs[i]} ${bottomManifoldY - 16} L ${pumpInletXs[i]} 274 A 16 16 0 0 1 ${pumpInletXs[i] + 16} 258 L ${pumpLefts[i]} 258`} flowDirection={isRunning ? 'forward' : 'none'} hideAnimation={true} />
                      ) : (
                        <Pipe path={`M ${pumpInletXs[i]} ${bottomManifoldY} L ${pumpInletXs[i]} 274 A 16 16 0 0 1 ${pumpInletXs[i] + 16} 258 L ${pumpLefts[i]} 258`} flowDirection={isRunning ? 'forward' : 'none'} hideAnimation={true} />
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
                        <Pipe path={`M ${pumpInletXs[i]} ${bottomManifoldY} L ${i + 1 === visiblePumps.length - 1 ? pumpInletXs[i + 1] - 16 : pumpInletXs[i + 1]} ${bottomManifoldY}`} flowDirection={nextRunning ? 'forward' : 'none'} />
                      )}
                    </React.Fragment>
                  );
                })}

                {visiblePumps.map((p, i) => {
                  const isRunning = p.status === 'RUNNING';
                  return (
                    <React.Fragment key={`outlet-pipe-vert-${p.id}`}>
                      {i === 0 ? (
                        <Pipe path={`M ${pumpPipeXs[i]} 95 L ${pumpPipeXs[i]} ${manifoldY + 16} A 16 16 0 0 1 ${pumpPipeXs[i] + 16} ${manifoldY}`} flowDirection={isRunning ? 'forward' : 'none'} hideAnimation={true} />
                      ) : (
                        <Pipe path={`M ${pumpPipeXs[i]} 95 L ${pumpPipeXs[i]} ${manifoldY}`} flowDirection={isRunning ? 'forward' : 'none'} hideAnimation={true} />
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
                        path={`M ${i === 0 ? pumpPipeXs[i] + 16 : pumpPipeXs[i]} ${manifoldY} L ${isLast ? (isTankOutlet ? rightTankLeft + 64 - 16 : outletEndX) : pumpPipeXs[i + 1]} ${manifoldY}`}
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

          <div className="absolute z-10" style={{ left: `${leftTankLeft}px`, top: '140px' }}>
            <Tank level={dashboardData.waterAvailable ? 75.6 : 0} title={inletTankTitle} />
          </div>

          {isTankOutlet ? (
            <>
              <div className="absolute z-10 w-32 flex justify-center text-center" style={{ left: `${rightTankLeft}px`, top: '5px' }}>
                <h3 className="text-gray-900 text-xs font-bold tracking-widest uppercase leading-tight">
                  {outletTitle.split(' ').map((word: string, index: number) => (
                    <React.Fragment key={index}>
                      {word}
                      {index < outletTitle.split(' ').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h3>
              </div>
              <div className="absolute z-10" style={{ left: `${rightTankLeft}px`, top: '70px' }}>
                <Tank level={75} title="" />
              </div>
            </>
          ) : (
            <div className="absolute top-[60px] z-10 -translate-y-1/2 flex items-center bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200" style={{ left: `${outletEndX + 10}px` }}>
              <h3 className="text-gray-700 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap">{outletTitle}</h3>
            </div>
          )}

          {visiblePumps.map((p, idx) => (
            <div key={p.id} className="absolute top-[95px] z-10" style={{ left: `${pumpLefts[idx]}px` }}>
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

          {/* OVERLAY FOR EXTENDED ANIMATIONS (z-20 to draw over pump cards) */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {visiblePumps.map((p, i) => {
              const isRunning = p.status === 'RUNNING';
              if (!isRunning) return null;
              
              const isLast = i === visiblePumps.length - 1;
              
              return (
                <React.Fragment key={`anim-overlay-${p.id}`}>
                  {/* Suction animation (extended to pump flange X = pumpLefts[i] + 46) */}
                  <Pipe 
                    path={isLast 
                      ? `M ${pumpInletXs[i] - 16} ${bottomManifoldY} A 16 16 0 0 0 ${pumpInletXs[i]} ${bottomManifoldY - 16} L ${pumpInletXs[i]} 274 A 16 16 0 0 1 ${pumpInletXs[i] + 16} 258 L ${pumpLefts[i] + 46} 258`
                      : `M ${pumpInletXs[i]} ${bottomManifoldY} L ${pumpInletXs[i]} 274 A 16 16 0 0 1 ${pumpInletXs[i] + 16} 258 L ${pumpLefts[i] + 46} 258`
                    } 
                    flowDirection="forward" 
                    hideBase={true} 
                  />
                  
                  {/* Discharge animation (extended to pump flange Y = 228) */}
                  <Pipe 
                    path={i === 0 
                      ? `M ${pumpPipeXs[i]} 188 L ${pumpPipeXs[i]} ${manifoldY + 16} A 16 16 0 0 1 ${pumpPipeXs[i] + 16} ${manifoldY}`
                      : `M ${pumpPipeXs[i]} 188 L ${pumpPipeXs[i]} ${manifoldY}`
                    }
                    flowDirection="forward" 
                    hideBase={true} 
                  />
                </React.Fragment>
              );
            })}
          </div>

          {visiblePumps.length === 0 && (
            <div
              className="absolute z-10 flex items-center justify-center pointer-events-none"
              style={{
                left: `${leftTankLeft + 195}px`,
                top: '105px',
                width: '260px',
                height: '350px'
              }}
            >
              <div className="bg-white px-6 py-6 rounded-xl border border-gray-200 text-gray-500 font-bold text-[14px] uppercase tracking-widest text-center shadow-sm">
                No Pumps Configured in Panel
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
