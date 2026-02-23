import React from 'react';

import { StaffLayout } from './staffLayout';

interface StaffLinesProps {
  layout: StaffLayout;
  contentWidth: number;
}

export const StaffLines: React.FC<StaffLinesProps> = ({ layout, contentWidth }) => (
  <>
    {[-2, -1, 0, 1, 2].map((i) => {
      const y = layout.STAFF_CENTER_Y + i * layout.STAFF_SPACE;
      return (
        <line
          key={`staff-line-${i}`}
          x1={layout.STAFF_SPACE * 0.5}
          y1={y}
          x2={contentWidth - layout.STAFF_SPACE * 0.5}
          y2={y}
          stroke="var(--color-staff-line)"
          strokeWidth={layout.STAFF_LINE_THICKNESS}
        />
      );
    })}
  </>
);
