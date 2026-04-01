import {
  Building2,
  HeadphonesIcon,
  Info,
  Shield,
  FileText,
  Phone,
  MessageCircle,
  DollarSign,
  Mail,
  Cookie,
  Copyright,
  Accessibility,
} from "lucide-react";
import { FooterSection } from "../types";

export const footerSections: FooterSection[] = [
  {
    id: "company",
    title: { en: "Company", he: "על החברה" },
    icon: Building2,
    links: [
      {
        label: { en: "About Us", he: "אודותינו" },
        icon: Info,
        href: "/about",
      },
      {
        label: { en: "Contact Us", he: "צור קשר" },
        icon: Phone,
        href: "/contact",
      },
      {
        label: { en: "Accessibility", he: "נגישות" },
        icon: Accessibility,
        href: "/accessibility",
      },
    ],
  },
  {
    id: "legal",
    title: { en: "Legal", he: "מידע משפטי" },
    icon: Shield,
    links: [
      {
        label: { en: "Privacy Policy", he: "מדיניות פרטיות" },
        icon: Shield,
        href: "/privacy",
      },
      {
        label: { en: "Terms of Service", he: "תנאי שימוש" },
        icon: FileText,
        href: "/terms",
      },
      {
        label: { en: "Cookie Policy", he: "מדיניות עוגיות" },
        icon: Cookie,
        href: "/cookie-policy",
      },
      {
        label: { en: "Copyright (DMCA)", he: "זכויות יוצרים" },
        icon: Copyright,
        href: "/copyright",
      },
    ],
  },
  {
    id: "support",
    title: { en: "Support", he: "תמיכה" },
    icon: HeadphonesIcon,
    links: [
      {
        label: { en: "Help Center", he: "מרכז התמיכה" },
        icon: MessageCircle,
        href: "mailto:support@localhost",
      },
      {
        label: { en: "Billing Questions", he: "שאלות חיוב" },
        icon: DollarSign,
        href: "mailto:billing@localhost",
      },
      {
        label: { en: "Email Support", he: "תמיכה במייל" },
        icon: Mail,
        href: "mailto:contact@localhost",
      },
    ],
  },
];