export const DEFAULT_AVATAR = "/avatars/default.svg";

export type PresetAvatar = {
  id: string;
  src: string;
  label: string;
};

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "01", src: "/avatars/01.svg", label: "Lime Duck" },
  { id: "02", src: "/avatars/02.svg", label: "Cyan Duck" },
  { id: "03", src: "/avatars/03.svg", label: "Violet Duck" },
  { id: "04", src: "/avatars/04.svg", label: "Amber Duck" },
  { id: "05", src: "/avatars/05.svg", label: "Rose Duck" },
  { id: "06", src: "/avatars/06.svg", label: "Sky Duck" },
  { id: "07", src: "/avatars/07.svg", label: "Orange Duck" },
  { id: "08", src: "/avatars/08.svg", label: "Emerald Duck" },
  { id: "09", src: "/avatars/09.svg", label: "Lime Fox" },
  { id: "10", src: "/avatars/10.svg", label: "Cyan Fox" },
  { id: "11", src: "/avatars/11.svg", label: "Violet Fox" },
  { id: "12", src: "/avatars/12.svg", label: "Amber Fox" },
  { id: "13", src: "/avatars/13.svg", label: "Rose Fox" },
  { id: "14", src: "/avatars/14.svg", label: "Sky Fox" },
  { id: "15", src: "/avatars/15.svg", label: "Orange Fox" },
  { id: "16", src: "/avatars/16.svg", label: "Emerald Fox" },
  { id: "17", src: "/avatars/17.svg", label: "Lime Cat" },
  { id: "18", src: "/avatars/18.svg", label: "Cyan Cat" },
  { id: "19", src: "/avatars/19.svg", label: "Violet Cat" },
  { id: "20", src: "/avatars/20.svg", label: "Amber Cat" },
  { id: "21", src: "/avatars/21.svg", label: "Rose Cat" },
  { id: "22", src: "/avatars/22.svg", label: "Sky Cat" },
  { id: "23", src: "/avatars/23.svg", label: "Orange Cat" },
  { id: "24", src: "/avatars/24.svg", label: "Emerald Cat" },
  { id: "25", src: "/avatars/25.svg", label: "Lime Owl" },
  { id: "26", src: "/avatars/26.svg", label: "Cyan Owl" },
  { id: "27", src: "/avatars/27.svg", label: "Violet Owl" },
  { id: "28", src: "/avatars/28.svg", label: "Amber Owl" },
  { id: "29", src: "/avatars/29.svg", label: "Rose Owl" },
  { id: "30", src: "/avatars/30.svg", label: "Sky Owl" },
  { id: "31", src: "/avatars/31.svg", label: "Orange Owl" },
  { id: "32", src: "/avatars/32.svg", label: "Emerald Owl" },
];

export const PRESET_AVATAR_SRC = new Set<string>([
  DEFAULT_AVATAR,
  ...PRESET_AVATARS.map((avatar) => avatar.src),
]);

export function canonicalizeAvatarUrl(url: string) {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("/avatars/") ||
    trimmed.includes("/storage/v1/object/public/avatars/")
  ) {
    return trimmed.split("?")[0];
  }
  return trimmed;
}

export function isAllowedAvatarUrl(
  url: string,
  userId: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const value = canonicalizeAvatarUrl(url);
  if (PRESET_AVATAR_SRC.has(value)) return true;
  if (supabaseUrl) {
    const base = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/${userId}/`;
    if (value.startsWith(base)) return true;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") {
      if (parsed.hostname.endsWith("googleusercontent.com")) return true;
      if (parsed.hostname === "avatars.githubusercontent.com") return true;
    }
  } catch {
    /* not an absolute URL */
  }
  return false;
}
