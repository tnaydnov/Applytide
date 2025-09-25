const tabs = [
  { key: "my", label: "My Events" },
  { key: "calendar", label: "Calendar" },
  { key: "import", label: "Import from Google" },
];

export default function ViewTabs({ active, onChange }) {
  return (
    <div className="mt-6 border-b">
      <nav className="-mb-px flex gap-6">
        {tabs.map((t) => {
          const activeCls = active === t.key
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-600 hover:text-gray-900";
          return (
            <button
              key={t.key}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${activeCls}`}
              onClick={() => onChange?.(t.key)}
              type="button"
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
