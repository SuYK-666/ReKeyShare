function FlowLines() {
  return (
    <div className="flow-lines" aria-hidden="true">
      <svg viewBox="0 0 1440 1024" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <linearGradient id="flow-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="flow-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <path d="M -80 180 C 280 60, 620 320, 980 160 S 1560 120, 1620 260" stroke="url(#flow-a)" strokeWidth="2" />
        <path d="M -120 520 C 260 420, 540 640, 920 500 S 1500 380, 1640 520" stroke="url(#flow-b)" strokeWidth="1.5" />
        <path d="M -100 880 C 320 760, 660 980, 1040 840 S 1580 760, 1660 900" stroke="url(#flow-a)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default FlowLines;
