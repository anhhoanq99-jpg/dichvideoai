/**
 * Class Tailwind dùng chung cho form control — trước đây chuỗi này bị
 * lặp nguyên văn ở hàng chục chỗ trong các panel. Ghép thêm class riêng
 * bằng cn() khi cần (vd: cn(selectClass, "w-full")).
 */
export const selectClass =
  "rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800";

export const inputClass = selectClass;

export const colorInputClass =
  "h-7 w-9 cursor-pointer rounded-md border border-neutral-200 dark:border-neutral-700";

/** Nhãn phụ nhỏ phía trên control. */
export const fieldLabelClass = "block text-xs text-neutral-500 dark:text-neutral-400";

/** Thẻ lựa chọn dạng card (chọn phương thức, chế độ che chữ...). */
export function optionCardClass(selected: boolean) {
  return [
    "rounded-lg border p-3 text-left text-sm transition-colors",
    selected
      ? "border-primary-500 bg-primary-50 dark:bg-primary-950/40"
      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700",
  ].join(" ");
}
