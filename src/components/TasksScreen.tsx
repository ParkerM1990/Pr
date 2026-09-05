import React, { useState } from 'react';
import { Task, Project, TaskStatus, Priority } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  User, 
  Trash2, 
  Plus, 
  X, 
  Briefcase, 
  FolderOpen,
  Link2
} from 'lucide-react';

interface TasksScreenProps {
  tasks: Task[];
  projects: Project[];
  onToggleTask: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'projectName'>) => void;
  onDeleteTask: (id: string) => void;
}

export default function TasksScreen({
  tasks,
  projects,
  onToggleTask,
  onAddTask,
  onDeleteTask
}: TasksScreenProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'overdue' | 'week'>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);

  // Task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<Priority>('normal');
  const [assignedTo, setAssignedTo] = useState('');

  const TODAY_STR = '2026-09-05'; // fixed simulated date

  const getPriorityLabelAndColor = (p: Priority) => {
    switch (p) {
      case 'low': return { label: ' Niski', color: 'text-green-500 bg-green-500/10 border-green-500/20' };
      case 'normal': return { label: ' Normalny', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'high': return { label: ' Wysoki', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
      case 'urgent': return { label: ' PILNE', color: 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse' };
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return <span className="text-[9px] px-2 py-0.5 rounded font-black bg-[#16161B] text-[#8E8E99] border border-[#1C1C21] uppercase tracking-wider">DO ZROBIENIA</span>;
      case 'in_progress': return <span className="text-[9px] px-2 py-0.5 rounded font-black bg-blue-950/20 text-blue-400 border border-blue-900/30 uppercase tracking-wider">W TRAKCIE</span>;
      case 'done': return <span className="text-[9px] px-2 py-0.5 rounded font-black bg-green-950/20 text-green-400 border border-green-900/30 uppercase tracking-wider">ZAKOŃCZONE</span>;
      case 'cancelled': return <span className="text-[9px] px-2 py-0.5 rounded font-black bg-[#1C1C21] text-[#666670] border border-[#2C2C34] uppercase tracking-wider">ANULOWANE</span>;
    }
  };

  // Filter tasks based on selected tab and project
  const getFilteredTasks = () => {
    let result = tasks;

    // Filter by project
    if (projectFilter !== 'all') {
      result = result.filter(t => t.projectId === projectFilter);
    }

    // Filter by tab
    if (activeFilter === 'today') {
      result = result.filter(t => t.dueDate === TODAY_STR && t.status !== 'done');
    } else if (activeFilter === 'overdue') {
      result = result.filter(t => t.dueDate < TODAY_STR && t.status !== 'done');
    } else if (activeFilter === 'week') {
      const next7DaysStr = new Date(new Date(TODAY_STR).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      result = result.filter(t => t.dueDate >= TODAY_STR && t.dueDate <= next7DaysStr && t.status !== 'done');
    }

    return result.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    onAddTask({
      title,
      description,
      projectId,
      dueDate,
      priority,
      status: 'todo',
      assignedTo: assignedTo || 'Użytkownik',
      sourceEntryId: null
    });

    setTitle('');
    setDescription('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setPriority('normal');
    setAssignedTo('');
    setIsAdding(false);
  };

  const filteredTasksList = getFilteredTasks();

  return (
    <div id="tasks-screen" className="pb-24 px-4 pt-2 text-[#E0E0E6] max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-black text-white leading-tight">Zadania</h2>
          <p className="text-[#8E8E99] text-xs mt-0.5">Zarządzanie harmonogramem prac i odbiorów</p>
        </div>
        <button
          id="open-add-task-btn"
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl flex items-center gap-1 font-extrabold text-[10px] shadow-lg shadow-blue-900/10 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          NOWE ZADANIE
        </button>
      </div>

      {/* Filters panel */}
      <div className="space-y-3 mb-5">
        {/* Horizontal scroll tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { value: 'all', label: 'Wszystkie' },
            { value: 'today', label: 'Na dziś 📅' },
            { value: 'overdue', label: '🔴 Przeterminowane' },
            { value: 'week', label: 'Ten tydzień 📅' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition ${
                activeFilter === tab.value 
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10' 
                  : 'bg-[#1C1C21] text-[#8E8E99] border-[#2C2C34] hover:border-[#2C2C34]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project Selector dropdown */}
        <div className="flex items-center gap-2 bg-[#1C1C21] border border-[#2C2C34] rounded-xl p-2 px-3.5">
          <Briefcase className="w-4 h-4 text-[#8E8E99] shrink-0" />
          <select
            id="task-project-filter-select"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-[#E0E0E6] font-bold outline-none border-none cursor-pointer"
          >
            <option value="all" className="bg-[#1C1C21] text-[#E0E0E6]">Wszystkie aktywne projekty</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} className="bg-[#1C1C21] text-[#E0E0E6]">{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasksList.map(t => {
          const isCompleted = t.status === 'done';
          const pDetails = getPriorityLabelAndColor(t.priority);
          
          return (
            <div
              id={`task-card-${t.id}`}
              key={t.id}
              className={`border rounded-2xl p-4 transition-all duration-200 relative ${
                isCompleted 
                  ? 'bg-[#1C1C21]/40 border-[#1C1C21] opacity-50' 
                  : t.dueDate < TODAY_STR 
                    ? 'bg-[#1C1C21] border-red-500/20 hover:border-red-500/30' 
                    : 'bg-[#1C1C21] border-[#2C2C34] hover:border-blue-500/20'
              }`}
            >
              <div className="flex gap-3 items-start">
                {/* Complete Checkbox Circle Button */}
                <button
                  id={`toggle-task-btn-${t.id}`}
                  onClick={() => onToggleTask(t.id)}
                  className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition ${
                    isCompleted 
                      ? 'text-green-500 hover:text-green-600' 
                      : 'text-[#8E8E99] hover:text-blue-500'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5.5 h-5.5 fill-green-500/10" />
                  ) : (
                    <Circle className="w-5.5 h-5.5 text-[#666670]" />
                  )}
                </button>

                {/* Main description section */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap justify-between items-start gap-1 mb-1">
                    <h3 className={`font-bold text-sm leading-tight ${isCompleted ? 'line-through text-[#666670]' : 'text-white'}`}>
                      {t.title}
                    </h3>
                  </div>

                  <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wide mb-2">{t.projectName}</p>
                  
                  {t.description && (
                    <p className={`text-xs leading-relaxed mb-3 ${isCompleted ? 'text-[#666670]' : 'text-[#8E8E99]'}`}>
                      {t.description}
                    </p>
                  )}

                  {/* Badges container */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E8E99]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${pDetails.color}`}>
                      {pDetails.label}
                    </span>
                    
                    {getStatusBadge(t.status)}

                    <span className="flex items-center gap-1 font-bold bg-[#16161B] px-2 py-0.5 rounded border border-[#1C1C21] text-[9px] uppercase tracking-wider">
                      <Calendar className="w-3 h-3 text-[#666670]" />
                      Termin: <strong className={t.dueDate < TODAY_STR && !isCompleted ? 'text-red-400 font-extrabold' : 'text-[#8E8E99]'}>{t.dueDate}</strong>
                    </span>

                    <span className="flex items-center gap-1 font-bold bg-[#16161B] px-2 py-0.5 rounded border border-[#1C1C21] text-[9px] uppercase tracking-wider">
                      <User className="w-3 h-3 text-[#666670]" />
                      Serwis: <strong className="text-[#8E8E99] truncate max-w-[80px]">{t.assignedTo}</strong>
                    </span>

                    {t.sourceEntryId && (
                      <span className="flex items-center gap-0.5 text-[#666670] text-[9px] uppercase tracking-widest font-black">
                        <Link2 className="w-3 h-3 text-blue-500" />
                        AI LINK
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  id={`delete-task-btn-${t.id}`}
                  onClick={() => {
                    if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
                      onDeleteTask(t.id);
                    }
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-red-950/20 flex items-center justify-center text-[#666670] hover:text-red-450 transition ml-2 self-start shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasksList.length === 0 && (
          <div className="text-center py-16 bg-[#16161B]/30 border border-[#1C1C21] rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-[#666670] mx-auto mb-2" />
            <p className="text-[#8E8E99] text-sm">Wszystko gotowe!</p>
            <p className="text-[#666670] text-xs mt-1">Brak aktywnych zadań spełniających wybrane kryteria.</p>
          </div>
        )}
      </div>

      {/* Add Task Modal overlay */}
      {isAdding && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#0F0F12] border-t sm:border border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-5 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <FolderOpen className="w-4 h-4 text-blue-500" />
                Dodaj Nowe Zadanie
              </h3>
              <button 
                onClick={() => setIsAdding(false)}
                className="w-8 h-8 rounded-full bg-[#1C1C21] hover:bg-[#2C2C34] flex items-center justify-center text-[#8E8E99] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Tytuł Zadania *</label>
                <input
                  id="new-task-title"
                  type="text"
                  required
                  placeholder="np. Przygotować raport z odbiorów"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Przypisz do Projektu</label>
                <select
                  id="new-task-project-id"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500/50"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Data Realizacji *</label>
                <input
                  id="new-task-due-date"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Priorytet</label>
                <select
                  id="new-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500/50"
                >
                  <option value="low">Niski 🟢</option>
                  <option value="normal">Normalny 🟡</option>
                  <option value="high">Wysoki 🟠</option>
                  <option value="urgent">Pilny 🔴</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Osoba Odpowiedzialna</label>
                <input
                  id="new-task-assigned-to"
                  type="text"
                  placeholder="np. Jan Kowalski, Wykonawca, Serwis"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Opis Zadania</label>
                <textarea
                  id="new-task-description"
                  rows={3}
                  placeholder="Szczegółowe instrukcje, oczekiwania i specyfika..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-[#1C1C21] hover:bg-[#2C2C34] border border-[#2C2C34] py-3 rounded-xl text-xs font-bold text-[#E0E0E6] transition"
                >
                  Anuluj
                </button>
                <button
                  id="submit-new-task-btn"
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/10 transition"
                >
                  Dodaj Zadanie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
