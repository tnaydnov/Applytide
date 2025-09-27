// Uniform page background + min height
export default function AppLayout({ children, className = "" }) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 ${className}`}>
      {children}
    </div>
  );
}
