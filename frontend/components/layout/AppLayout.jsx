// Uniform page background + min height
export default function AppLayout({ children, className = "" }) {
  return (
    // Solid background, no gradients
    <div className={`min-h-screen bg-slate-950 ${className}`}>
      {children}
    </div>
  );
}
