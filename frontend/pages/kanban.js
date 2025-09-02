import KanbanBoard from '../../components/kanban/KanbanBoard';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function KanbanPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden">
        <KanbanBoard />
      </div>
    </DashboardLayout>
  );
}
