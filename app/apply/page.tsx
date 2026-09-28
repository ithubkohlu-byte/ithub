import ApplyWizard from "@/components/apply/ApplyWizard";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function ApplyPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-6">
      <div className="mx-auto mb-8 max-w-2xl">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-line text-base-950">
            <Zap size={18} strokeWidth={2.5} />
          </span>
          IT <span className="neon-text">HUB</span> Admissions
        </Link>
      </div>
      <ApplyWizard />
    </main>
  );
}
