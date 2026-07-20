"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, Loader2, LogOut, Receipt, UserCog } from "lucide-react";
import { signOut, updateUser } from "@/lib/auth-client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { fieldLabelClass, inputClass } from "@/components/ui/form-styles";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const T = {
  vi: {
    aria: "Menu tài khoản",
    profile: "Thông tin tài khoản",
    topup: "Nạp xu",
    transactions: "Lịch sử giao dịch",
    signOut: "Đăng xuất",
    editTitle: "Thông tin tài khoản",
    name: "Tên hiển thị",
    namePlaceholder: "Tên bạn muốn hiển thị",
    emailLabel: "Email đăng nhập",
    emailNote: "Email dùng để đăng nhập, không đổi được tại đây.",
    save: "Lưu thay đổi",
    saving: "Đang lưu…",
    saved: "Đã lưu thông tin",
    failed: "Lưu không được — thử lại",
    emptyName: "Tên không được để trống",
  },
  en: {
    aria: "Account menu",
    profile: "Account info",
    topup: "Top up credits",
    transactions: "Transaction history",
    signOut: "Sign out",
    editTitle: "Account info",
    name: "Display name",
    namePlaceholder: "The name shown to you",
    emailLabel: "Login email",
    emailNote: "This email is used to sign in and cannot be changed here.",
    save: "Save changes",
    saving: "Saving…",
    saved: "Saved",
    failed: "Could not save — try again",
    emptyName: "Name cannot be empty",
  },
} as const;

interface UserMenuProps {
  name: string;
  email: string;
  image?: string | null;
  lang?: Lang;
}

const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function UserMenu({ name, email, image, lang = "vi" }: UserMenuProps) {
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.aria}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
      >
        {image ? (
          <Image
            src={image}
            alt={name}
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {email}
            </p>
          </div>
          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
            className={itemClass}
          >
            <UserCog className="h-4 w-4" /> {t.profile}
          </button>
          <Link href="/credits" onClick={() => setOpen(false)} className={itemClass}>
            <Coins className="h-4 w-4" /> {t.topup}
          </Link>
          <Link href="/transactions" onClick={() => setOpen(false)} className={itemClass}>
            <Receipt className="h-4 w-4" /> {t.transactions}
          </Link>

          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            }}
            className={itemClass}
          >
            <LogOut className="h-4 w-4" /> {t.signOut}
          </button>
        </div>
      )}

      {editing && (
        <ProfileModal
          name={name}
          email={email}
          lang={lang}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/** Hộp thoại sửa thông tin tài khoản (hiện chỉ tên hiển thị — email là khoá đăng nhập). */
function ProfileModal({
  name,
  email,
  lang,
  onClose,
}: {
  name: string;
  email: string;
  lang: Lang;
  onClose: () => void;
}) {
  const t = T[lang];
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    const next = value.trim();
    if (!next) {
      setMsg({ text: t.emptyName, ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await updateUser({ name: next });
      if (res.error) {
        setMsg({ text: res.error.message ?? t.failed, ok: false });
        return;
      }
      setMsg({ text: t.saved, ok: true });
      router.refresh(); // header lấy tên mới
    } catch {
      setMsg({ text: t.failed, ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={
        <>
          <UserCog className="h-4 w-4 text-primary-500" /> {t.editTitle}
        </>
      }
      onClose={onClose}
      lang={lang}
    >
      <div className="space-y-4">
        <label className="block text-sm">
          <span className={fieldLabelClass}>{t.name}</span>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setMsg(null);
            }}
            placeholder={t.namePlaceholder}
            maxLength={60}
            className={cn(inputClass, "mt-1 w-full")}
          />
        </label>

        <div className="text-sm">
          <span className={fieldLabelClass}>{t.emailLabel}</span>
          <p className="mt-1 truncate rounded-lg bg-neutral-100 px-2.5 py-1.5 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {email}
          </p>
          <p className="mt-1 text-xs text-neutral-400">{t.emailNote}</p>
        </div>

        {msg && (
          <p
            className={cn(
              "rounded-md px-3 py-2 text-xs",
              msg.ok
                ? "bg-success-50 text-success-700 dark:bg-success-950/40 dark:text-success-300"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
            )}
          >
            {msg.text}
          </p>
        )}

        <Button onClick={save} disabled={busy} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? t.saving : t.save}
        </Button>
      </div>
    </Modal>
  );
}
