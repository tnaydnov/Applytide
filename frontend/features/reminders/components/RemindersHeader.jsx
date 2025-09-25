import { Button } from "../../../components/ui";
import { generateICSContent, downloadFile } from "../utils/ics";

export default function RemindersHeader({
  onCreate,
  reminders = [],
  applications = [],
}) {
  const exportICS = () => {
    const ics = generateICSContent(reminders, applications);
    downloadFile(ics, "applytide-reminders.ics");
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h1 className="text-2xl font-semibold text-gray-900">Reminders</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={exportICS}>Export .ics</Button>
        <Button onClick={onCreate}>+ Create Reminder</Button>
      </div>
    </div>
  );
}
