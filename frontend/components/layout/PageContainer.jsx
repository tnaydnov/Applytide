// Consistent page width + padding
export default function PageContainer({ children, size = "xl", className = "" }) {
  const max = {
    xl: "max-w-7xl",
    lg: "max-w-6xl",
    md: "max-w-5xl",
    sm: "max-w-4xl",
  }[size] || "max-w-7xl";

  return (
    <div className={`${max} mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {children}
    </div>
  );
}
