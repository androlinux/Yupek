import React from "react";

const paths: Record<string, string> = {
  // Apple-inspired minimal line icons: 1.5px stroke, rounded caps/joins, balanced geometry
  search:
    "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.2 15.2l5.3 5.3",
  user:
    "M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M4.5 20c0-3.8 3.35-6.5 7.5-6.5s7.5 2.7 7.5 6.5",
  bag:
    "M6 8.5h12l-1 11.2a1.8 1.8 0 0 1-1.8 1.8H8.8a1.8 1.8 0 0 1-1.8-1.8L6 8.5z M9 8.5V6a3 3 0 0 1 6 0v2.5",
  heart:
    "M12 20.2s-7-4.5-7-10a4.5 4.5 0 0 1 7-3.7 4.5 4.5 0 0 1 7 3.7c0 5.5-7 10-7 10z",
  menu:
    "M3.5 7h17 M3.5 12h17 M3.5 17h17",
  close:
    "M6.5 6.5l11 11 M17.5 6.5l-11 11",
  chevron:
    "M6.5 10l5.5 5 5.5-5",
  chevronDown:
    "M6.5 10l5.5 5 5.5-5",
  chevronUp:
    "M6.5 14l5.5-5 5.5 5",
  chevronRight:
    "M10 6.5l5 5.5-5 5.5",
  chevronLeft:
    "M14 6.5l-5 5.5 5 5.5",
  plus:
    "M12 5.5v13 M5.5 12h13",
  minus:
    "M5.5 12h13",
  check:
    "M4.5 12.5l5 5 10-10",
  arrowRight:
    "M5 12h14 M13.5 6.5L19 12l-5.5 5.5",
  arrowLeft:
    "M19 12H5 M10.5 6.5L5 12l5.5 5.5",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
  upload:
    "M20.5 15.5v3.5a1.5 1.5 0 0 1-1.5 1.5h-14a1.5 1.5 0 0 1-1.5-1.5v-3.5 M16.5 8.5L12 4l-4.5 4.5 M12 4v11",
  image:
    "M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M8.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 20",
  trash:
    "M4 6.5h16 M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2 M6 6.5l1 13.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5l1-13.5 M10 11v6 M14 11v6",
  refresh:
    "M21 4v5h-5 M3 20v-5h5 M3.8 9.5a9 9 0 0 1 14.7-3.2L21 9 M3 15l2.5 2.7A9 9 0 0 0 20.2 14.5",
  mail:
    "M3.5 6.5h17a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z M21 7.5l-9 6.5-9-6.5",
  truck:
    "M2 7.5h11a1 1 0 0 1 1 1v7.5H2V7.5z M14 10.5h4.2a1 1 0 0 1 .8.4l2.5 3.3a1 1 0 0 1 .2.6v2.2H14v-6.5z M5.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  volume:
    "M10.5 5.5L6 9.5H3v5h3l4.5 4v-13z M15.5 9a4.5 4.5 0 0 1 0 6 M18.5 6a8.5 8.5 0 0 1 0 12",
  volumeMute:
    "M10.5 5.5L6 9.5H3v5h3l4.5 4v-13z M16 10l5 5 M21 10l-5 5",
  eye:
    "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  accessibility:
    "M12 4.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z M12 6.5v6 M7 8.5l5 2 5-2 M9 21l3-8.5 3 8.5",
  play:
    "M6 4.5l13 7.5-13 7.5V4.5z",
  pause:
    "M7 5h3v14H7V5z M14 5h3v14h-3V5z",
  ruler:
    "M2.5 7h19v10h-19V7z M6.5 7v3 M10.5 7v5 M14.5 7v3 M18.5 7v5",
  type:
    "M4 7V5h16v2 M12 5v14 M8.5 19h7",
};

export default function Icon({
  name,
  className = "h-5 w-5",
  fill = false,
  strokeWidth = 1.5,
}: {
  name: keyof typeof paths;
  className?: string;
  fill?: boolean;
  strokeWidth?: number | string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.chevron} />
    </svg>
  );
}
