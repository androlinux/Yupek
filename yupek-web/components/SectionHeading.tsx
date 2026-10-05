import { Divider } from "./ui/Pattern";
export default function SectionHeading({ title, sub, align = "center" }: { title: string; sub?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <h2 className="h-display text-4xl md:text-6xl">{title}</h2>
      {sub && <p className="label mt-4 text-brown/60">{sub}</p>}
      {align === "center" && <Divider className="mt-6" />}
    </div>
  );
}
