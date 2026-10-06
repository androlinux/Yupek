"use client";

import React from "react";
import { useAccessibility } from "./AccessibilityContext";
import ColorBlindFilters from "./ColorBlindFilters";
import ReadingGuide from "./ReadingGuide";
import AccessibilityDrawer from "./AccessibilityDrawer";

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
