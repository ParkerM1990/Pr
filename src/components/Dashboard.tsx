import React from 'react';
import { Project, Task, Issue, JournalEntry } from '../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  MapPin,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  recentEntries: JournalEntry[];
  onSelectProject: (projectId: string) => void;
  onNavigateToTab: (tab: 'today' | 'projects' | 'journal' | 'tasks') => void;
}

export default function Dashboard({
  projects,
  tasks,
  issues,
  recentEntries,
  onSelectProject,
  onNavigateToTab
}: DashboardProps) {
  // Current simulated date is 2026-09-05
  const TODAY_STR = '2026-09-05';
  
  // Calculate stats
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.dueDate < TODAY_STR);
  const todayTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.dueDate === TODAY_STR);
  const openIssues = issues.filter(i => i.status !== 'resolved');
  
  // 7 days upcoming tasks (excluding today and overdue)
  const next7DaysStr = new Date(new Date(TODAY_STR).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const upcomingTasks = tasks.filter(t => 
    t.status !== 'done' && 
    t.status !== 'cancelled' && 
    t.dueDate > TODAY_STR && 
    t.dueDate <= next7DaysStr
  );

  // Format date to Polish: Sobota, 5 września 2026
  const getFormattedDate = () => {
    return 'Sobota, 5 września 2026';
  };

  const getStatusDot = (status: 'OK' | 'WARNING' | 'PROBLEM') => {
    switch (status) {
      case 'OK': return <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>;
      case 'WARNING': return <span className="w-2 h-2 rounded-full bg-orange-500 inline-block mr-2 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse"></span>;
      case 'PROBLEM': return <span className="w-2 h-2 rounded-full bg-red-500 inline-block mr-2 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></span>;
    }
  };

  const getStatusText = (status: 'OK' | 'WARNING' | 'PROBLEM') => {
    switch (status) {
      case 'OK': return <span className="text-green-500 font-bold text-[10px]">OK</span>;
      case 'WARNING': return <span className="text-orange-500 font-bold text-[10px]">WYMAGA UWAGI</span>;
      case 'PROBLEM': return <span className="text-red-500 font-bold text-[10px]">PROBLEM</span>;
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'note': return '📝';
      case 'meeting': return '🤝';
      case 'contact': return '☎️';
      case 'issue': return '⚠️';
      case 'work': return '🔧';
      case 'done': return '✅';
      case 'decision': return '📅';
      case 'document': return '📄';
      case 'photo': return '📷';
      default: return '💡';
    }
  };

  return (
    <div id="dashboard-screen" className="pb-24 px-4 pt-2 text-[#E0E0E6] max-w-lg mx-auto">
      {/* Top Header Section */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <p className="text-[#8E8E99] text-xs font-semibold">Dzień dobry, Jan</p>
          <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">Dzisiaj</h2>
          <p className="text-blue-400 text-[10px] font-bold uppercase mt-1.5 tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {getFormattedDate()}
          </p>
        </div>
        <div className="bg-[#1C1C21] border border-[#2C2C34] px-2.5 py-1.5 rounded-xl shadow-lg flex items-center justify-center">
          <span className="text-[10px] font-extrabold text-blue-400">TRYB OFFLINE 🟢</span>
        </div>
      </div>

      {/* DZISIAJ Status Summary Widget */}
      <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-5 mb-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-5">
          <TrendingUp className="w-20 h-20 text-blue-500" />
        </div>
        
        <h2 className="text-[10px] font-black uppercase tracking-widest text-[#666670] mb-4 flex items-center gap-2">
          <span className="w-1.5 h-3 bg-blue-500 rounded-full inline-block"></span>
          Statystyki Dnia
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Overdue */}
          <button 
            id="overdue-tasks-widget"
            onClick={() => onNavigateToTab('tasks')}
            className="p-3 bg-[#16161B] rounded-2xl border border-[#1C1C21] hover:border-[#2C2C34] transition duration-200 text-left active:scale-[0.98] flex flex-col gap-1.5"
          >
            <span className="text-red-500 font-black text-xl leading-none">{overdueTasks.length}</span>
            <p className="text-[10px] text-[#8E8E99] leading-tight uppercase tracking-wider font-bold">Zadania<br/>przeterminowane</p>
          </button>

          {/* Today */}
          <button 
            id="today-tasks-widget"
            onClick={() => onNavigateToTab('tasks')}
            className="p-3 bg-[#16161B] rounded-2xl border border-[#1C1C21] hover:border-[#2C2C34] transition duration-200 text-left active:scale-[0.98] flex flex-col gap-1.5"
          >
            <span className="text-orange-500 font-black text-xl leading-none">{todayTasks.length}</span>
            <p className="text-[10px] text-[#8E8E99] leading-tight uppercase tracking-wider font-bold">Zadania<br/>na dziś</p>
          </button>

          {/* Problems */}
          <button 
            id="active-issues-widget"
            onClick={() => onNavigateToTab('projects')}
            className="p-3 bg-[#16161B] rounded-2xl border border-[#1C1C21] hover:border-[#2C2C34] transition duration-200 text-left active:scale-[0.98] flex flex-col gap-1.5"
          >
            <span className="text-yellow-500 font-black text-xl leading-none">{openIssues.length}</span>
            <p className="text-[10px] text-[#8E8E99] leading-tight uppercase tracking-wider font-bold">Otwarte<br/>problemy</p>
          </button>

          {/* Next 7 Days */}
          <button 
            id="upcoming-deadlines-widget"
            onClick={() => onNavigateToTab('tasks')}
            className="p-3 bg-[#16161B] rounded-2xl border border-[#1C1C21] hover:border-[#2C2C34] transition duration-200 text-left active:scale-[0.98] flex flex-col gap-1.5 shadow-[inset_0_0_12px_rgba(59,130,246,0.05)]"
          >
            <span className="text-blue-500 font-black text-xl leading-none">{upcomingTasks.length}</span>
            <p className="text-[10px] text-[#8E8E99] leading-tight uppercase tracking-wider font-bold">Terminy<br/>(7 dni)</p>
          </button>
        </div>
      </div>

      {/* Active Projects List */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <p className="text-[10px] uppercase tracking-widest text-[#666670] font-black">
            Moje Projekty
          </p>
          <button 
            id="view-all-projects-btn"
            onClick={() => onNavigateToTab('projects')}
            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center font-black uppercase tracking-wider"
          >
            Wszystkie ({projects.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {projects.slice(0, 3).map(p => {
            const projectTasksCount = tasks.filter(t => t.projectId === p.id && t.status !== 'done').length;
            const projectIssuesCount = issues.filter(i => i.projectId === p.id && i.status !== 'resolved').length;
            
            return (
              <div 
                id={`project-card-${p.id}`}
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="bg-[#1C1C21] border border-[#2C2C34] hover:border-blue-500/20 p-4 rounded-2xl cursor-pointer transition duration-200 hover:translate-y-[-1px] active:scale-[0.99]"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm leading-snug break-words">{p.name}</h4>
                    <p className="text-[#8E8E99] text-[11px] flex items-center gap-1 mt-0.5 break-words">
                      <MapPin className="w-3 shrink-0 text-[#666670]" />
                      {p.address}
                    </p>
                  </div>
                  <div className="flex items-center bg-[#16161B] px-2 py-1 rounded-lg border border-[#1C1C21] shrink-0">
                    {getStatusDot(p.status)}
                    {getStatusText(p.status)}
                  </div>
                </div>

                <div className="border-t border-[#1C1C21] my-2.5"></div>

                <div className="flex justify-between items-center text-[11px] text-[#8E8E99]">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 font-semibold">
                      <strong className="text-white">{projectTasksCount}</strong> zadania
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <strong className="text-white">{projectIssuesCount}</strong> problemy
                    </span>
                  </div>
                  <span className="text-blue-400 font-extrabold flex items-center gap-0.5 uppercase tracking-wider text-[10px]">
                    Szczegóły
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-widest text-[#666670] font-black mb-3">
          Ostatnia Aktywność
        </p>

        <div className="bg-[#16161B]/40 border border-[#1C1C21] rounded-2xl p-4 space-y-6">
          {recentEntries.slice(0, 3).map((e, index) => (
            <div key={e.id} className="flex gap-3 relative pb-2">
              {/* Timeline pipe */}
              {index < Math.min(recentEntries.length, 3) - 1 && (
                <div className="absolute top-8 bottom-0 left-[13px] w-[1px] bg-[#2C2C34]"></div>
              )}
              
              <div className="w-7 h-7 rounded-lg bg-[#1C1C21] border border-[#2C2C34] flex items-center justify-center text-xs shadow-sm z-10 shrink-0 select-none">
                {getCategoryEmoji(e.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-1">
                  <h4 className="text-[11px] font-bold text-white break-words pr-1">{e.title}</h4>
                  <span className="text-[9px] text-[#666670] font-semibold whitespace-nowrap shrink-0">{e.time}</span>
                </div>
                <p className="text-[9px] text-blue-400 font-extrabold uppercase tracking-wide mt-0.5 break-words">{e.projectName}</p>
                <div className="text-[11px] text-[#8E8E99] mt-1.5 leading-relaxed bg-[#16161B] p-2.5 rounded-xl border border-[#1C1C21] break-words whitespace-pre-wrap w-full h-auto block">
                  {e.content}
                </div>
              </div>
            </div>
          ))}

          {recentEntries.length === 0 && (
            <div className="text-center py-6 text-[#666670] text-xs italic">
              Brak niedawnych wpisów w dzienniku.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
