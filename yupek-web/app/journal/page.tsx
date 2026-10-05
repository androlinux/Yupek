import type { Metadata } from "next";
import JournalClient from "./JournalClient";

export const metadata: Metadata = {
  title: "Journal — YUPEK Chronicles",
  description: "Essays on Silk Road heritage, textile geometry, and contemporary European tailoring.",
};

export default function JournalPage() {
  return <JournalClient />;
}
