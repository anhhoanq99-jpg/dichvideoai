import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export interface LegalSection {
  title: string;
  body: string[];
}

/** Khung trang pháp lý (Điều khoản / Bảo mật): header + các mục nội dung + footer. */
export function LegalPage({
  heading,
  updatedAt,
  sections,
}: {
  heading: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-cinema text-neutral-200">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-white">{heading}</h1>
        <p className="mt-2 text-sm text-neutral-400">Cập nhật: {updatedAt}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-white">{s.title}</h2>
              {s.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-2 text-sm leading-relaxed text-neutral-400"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
