import { LucideIcon } from "lucide-react";

// ========== Navigation Types ==========

export interface NavigationItem {
  label: { en: string; he: string };
  icon: LucideIcon;
  href?: string;
  submenu?: SubMenuItem[];
}

export interface SubMenuItem {
  label: { en: string; he: string };
  href: string;
}

export interface UserMenuItem {
  label: { en: string; he: string };
  icon: LucideIcon;
  href: string;
  variant?: "danger";
}

export interface FooterSection {
  id: string;
  title: { en: string; he: string };
  icon: LucideIcon;
  links: FooterLink[];
}

export interface FooterLink {
  label: { en: string; he: string };
  icon: LucideIcon;
  href: string;
}

// ========== Auth Types ==========

export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}
