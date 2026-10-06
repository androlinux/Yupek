"use client";

import dynamic from "next/dynamic";
import { useAccessibility } from "./AccessibilityContext";
import ColorBlindFilters from "./ColorBlindFilters";

const ReadingGuide = dynamic(() => import("./ReadingGuide"), { ssr: false });
const AccessibilityDrawer = dynamic(() => import("./AccessibilityDrawer"), { ssr: false });

export default function AccessibilityWidgets() {
  const { readingGuide } = useAccessibility();

  return (
    <>
      <ColorBlindFilters />
      {readingGuide && <ReadingGuide />}
      <AccessibilityDrawer />
    </>
  );
}
