import Link from "next/link";

export default function NavBar() {
  const links = [
    ["Home", "/"],
    ["Dashboard", "/dashboard"],
    ["Pipeline", "/pipeline"],
    ["Jobs", "/jobs"],
    ["Resumes", "/resumes"],
    ["Login", "/login"],
  ];
  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #eee" }}>
      {links.map(([label, href]) => (
        <Link key={href} href={href} style={{ textDecoration: "none" }}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
