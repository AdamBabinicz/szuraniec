import Link from "next/link";
import { notFound } from "next/navigation";
import { MoveLeft } from "lucide-react";
import pl from "@/lib/locales/pl.json";
import en from "@/lib/locales/en.json";

type Dictionary = typeof pl | typeof en;
type DocumentSection = Record<string, string>;

export default async function DynamicLegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Logika wyboru tłumaczenia na podstawie adresu URL (slug)
  let t: Dictionary | null = null;
  let mode: "PRIVACY" | "TERMS" | null = null;

  if (slug === pl.PRIVACY_SLUG) {
    t = pl;
    mode = "PRIVACY";
  } else if (slug === en.PRIVACY_SLUG) {
    t = en;
    mode = "PRIVACY";
  } else if (slug === pl.TERMS_SLUG) {
    t = pl;
    mode = "TERMS";
  } else if (slug === en.TERMS_SLUG) {
    t = en;
    mode = "TERMS";
  }

  // Jeśli adres nie pasuje do żadnego dokumentu - wyrzuć 404
  if (!t || !mode) {
    notFound();
  }

  // Wyciągamy konkretną sekcję (PRIVACY lub TERMS) z wybranego JSONa
  const content = t[mode] as DocumentSection;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em] mb-12 hover:opacity-70 transition-all"
        >
          <MoveLeft className="size-4" />
          {t.BACK_TO_APP}
        </Link>

        <header className="mb-16 border-l-4 border-primary pl-6 py-2">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">
            {content.TITLE}
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em]">
            {t.LAST_UPDATED}
          </p>
        </header>

        <div className="grid gap-12">
          {content.SEC_1_TITLE && content.SEC_1_TEXT && (
            <section className="grid gap-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary">
                {content.SEC_1_TITLE}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground font-medium border-l border-border/50 pl-6">
                {content.SEC_1_TEXT}
              </p>
            </section>
          )}

          {content.SEC_2_TITLE && content.SEC_2_TEXT && (
            <section className="grid gap-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary">
                {content.SEC_2_TITLE}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground font-medium border-l border-border/50 pl-6">
                {content.SEC_2_TEXT}
              </p>
            </section>
          )}

          {content.SEC_3_TITLE && content.SEC_3_TEXT && (
            <section className="grid gap-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary">
                {content.SEC_3_TITLE}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground font-medium border-l border-border/50 pl-6">
                {content.SEC_3_TEXT}
              </p>
            </section>
          )}

          {content.SEC_4_TITLE && content.SEC_4_TEXT && (
            <section className="grid gap-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary">
                {content.SEC_4_TITLE}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground font-medium border-l border-border/50 pl-6">
                {content.SEC_4_TEXT}
              </p>
            </section>
          )}
        </div>

        <footer className="mt-24 pt-8 border-t border-border/30">
          <p className="text-[10px] text-center text-muted-foreground/20 font-black uppercase tracking-[0.5em]">
            {t.APP_LEGAL_NAME}
          </p>
        </footer>
      </div>
    </div>
  );
}
