import styles from "./Avatar.module.css";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return <span className={[styles.avatar, styles[`avatar--${size}`]].join(" ")} aria-label={name}>{initials}</span>;
}
