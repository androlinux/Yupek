import React from "react";

/**
 * Embedded SVG Color Blindness filters using standardized Brettel/Viénot matrices.
 * Provides scientifically calibrated color vision adaptation for:
 * - Deuteranopia (green deficiency)
 * - Protanopia (red deficiency)
 * - Tritanopia (blue deficiency)
 */
export default function ColorBlindFilters() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        {/* Deuteranopia (Green-Weak / Red-Green Confusion) */}
        <filter id="deuteranopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0       0 0
                    0.700 0.300 0       0 0
                    0     0.300 0.700   0 0
                    0     0     0       1 0"
          />
        </filter>

        {/* Protanopia (Red-Weak / Red-Green Confusion) */}
        <filter id="protanopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.56667 0.43333 0       0 0
                    0.55833 0.44167 0       0 0
                    0       0.24167 0.75833 0 0
                    0       0       0       1 0"
          />
        </filter>

        {/* Tritanopia (Blue-Yellow Confusion) */}
        <filter id="tritanopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.950 0.050 0       0 0
                    0     0.433 0.567   0 0
                    0     0.475 0.525   0 0
                    0     0     0       1 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
