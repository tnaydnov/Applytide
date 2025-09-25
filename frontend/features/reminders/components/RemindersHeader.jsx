import { Button } from "../../../components/ui";
import { generateICSContent, downloadFile } from "../utils/ics";

export default function RemindersHeader({ onCreate, reminders = [], applications = [] }) {
  const exportICS = () => {
    const ics = generateICSContent(reminders, applications);
    downloadFile(ics, "applytide-reminders.ics");
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
          Reminders
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Track interviews, follow-ups & deadlines — import events from Google, all in one place.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={exportICS}>Export .ics</Button>
        <Button onClick={onCreate}>+ Create Reminder</Button>
      </div>
    </div>
  );
}
