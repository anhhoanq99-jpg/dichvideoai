import { Reveal } from "./reveal";

/** Cụm tiêu đề section (h2 + mô tả tùy chọn) — hiện dần khi cuộn tới, dùng chung cho các section landing. */
export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal>
      <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-3 max-w-xl text-center text-neutral-400">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
