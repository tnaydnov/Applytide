// Consistent title, subtitle, actions (right-aligned), and optional subheader row (tabs, toolbars, etc.)
export default function PageHeader({ title, subtitle, actions = null, subheader = null }) {
  return (
    <header className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {subheader && <div className="mt-4">{subheader}</div>}
    </header>
  );
}
