import React, { useState, useEffect } from 'react';
import { 
  Project, 
  JournalEntry, 
  Task, 
  Issue, 
  Contact, 
  AppNotification, 
  ProjectStatus, 
  Priority,
  JournalCategory
} from './types';
import { 
  getProjects, 
  getJournalEntries, 
  getTasks, 
  getIssues, 
  getContacts, 
  getNotifications,
  addProject,
  addJournalEntry,
  addTask,
  addIssue,
  addContact,
  updateContact,
  toggleTaskCompleted,
  deleteProject,
  updateProject,
  deleteJournalEntry,
  deleteJournalEntryDocument,
  deleteJournalEntryDocuments,
  deleteJournalEntryPhoto,
  deleteJournalEntryPhotos,
  addProjectPhotos,
  deleteTask,
  deleteIssue,
  deleteContact,
  globalSearch,
  SearchResult,
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
  initDb
} from './db/localDb';

// Import Screens & Components
import Dashboard from './components/Dashboard';
import ProjectsScreen from './components/ProjectsScreen';
import JournalScreen from './components/JournalScreen';
import TasksScreen from './components/TasksScreen';
import ProjectDetails from './components/ProjectDetails';
import AddEntryModal from './components/AddEntryModal';

// Icons
import { 
  Calendar as TodayIcon, 
  Folder as ProjectsIcon, 
  BookOpen as JournalIcon, 
  CheckSquare as TasksIcon, 
  Plus, 
  Search, 
  Bell, 
  X, 
  AlertTriangle, 
  MapPin, 
  FileText, 
  User, 
  Phone, 
  ChevronRight,
  Sparkles,
  Settings,
  LogOut
} from 'lucide-react';

export default function App() {
  // Navigation states
  const [currentTab, setCurrentTab] = useState<'today' | 'projects' | 'journal' | 'tasks'>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Overlays / Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);

  // Core synchronized data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Generator of recurring tasks from contract (for 5 years / 60 months)
  const generateMonthlyRecurringTasks = (projectId: string, projectName: string, startDateStr: string, rTasks: { title: string; description: string; dayOfMonth: number }[]) => {
    const start = new Date(startDateStr || new Date().toISOString().split('T')[0]);
    if (isNaN(start.getTime())) return;

    const tasksToInsert: any[] = [];
    
    // Generate for 5 years (60 months)
    for (let monthOffset = 0; monthOffset < 60; monthOffset++) {
      const currentMonthDate = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1);
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();

      rTasks.forEach(rt => {
        const lastDayOfThisMonth = new Date(year, month + 1, 0).getDate();
        const targetDay = Math.min(rt.dayOfMonth, lastDayOfThisMonth);
        
        const pad = (num: number) => String(num).padStart(2, '0');
        const dueDateStr = `${year}-${pad(month + 1)}-${pad(targetDay)}`;

        tasksToInsert.push({
          title: rt.title,
          description: rt.description,
          projectId,
          projectName,
          dueDate: dueDateStr,
          priority: 'normal',
          status: 'todo',
          assignedTo: 'Użytkownik',
          sourceEntryId: 'contract_recurring'
        });
      });
    }

    const existingTasksStr = localStorage.getItem('pdp_tasks');
    const existingTasks = existingTasksStr ? JSON.parse(existingTasksStr) : [];
    
    const processedTasks = tasksToInsert.map((t, idx) => ({
      ...t,
      id: `task_recurring_${projectId}_${idx}_${Date.now()}`,
      createdAt: new Date().toISOString()
    }));

    const combined = [...existingTasks, ...processedTasks];
    localStorage.setItem('pdp_tasks', JSON.stringify(combined));
  };

  // Automated Task reminders checker (triggers alert after 10:00 AM on due dates)
  const checkForPendingTaskReminders = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    // Only remind after 10:00 AM
    if (currentHour < 10) return;

    const allTasksStr = localStorage.getItem('pdp_tasks');
    if (!allTasksStr) return;
    const allTasks = JSON.parse(allTasksStr) as Task[];

    const pendingTasks = allTasks.filter(t => 
      t.status !== 'done' && 
      t.status !== 'cancelled' && 
      t.dueDate <= todayStr
    );

    if (pendingTasks.length === 0) return;

    const triggeredKey = 'pdp_triggered_reminders_tasks';
    const triggeredStr = localStorage.getItem(triggeredKey);
    const triggeredSet = new Set<string>(triggeredStr ? JSON.parse(triggeredStr) : []);

    let addedAny = false;
    const currentNotifications = getNotifications();

    pendingTasks.forEach(task => {
      const reminderKey = `${task.id}_${todayStr}`;
      
      if (!triggeredSet.has(reminderKey)) {
        const isAlreadyNotified = currentNotifications.some(n => 
          n.title === 'Przypomnienie o zadaniu z umowy' && 
          n.message.includes(task.title) &&
          n.date.startsWith(todayStr)
        );

        if (!isAlreadyNotified) {
          addNotification({
            title: 'Przypomnienie o zadaniu z umowy',
            message: `Zadanie "${task.title}" (Projekt: ${task.projectName}) nie zostało oznaczone jako wykonane na dzień ${task.dueDate}.`,
            type: 'warning'
          });
          triggeredSet.add(reminderKey);
          addedAny = true;
        }
      }
    });

    if (addedAny) {
      localStorage.setItem(triggeredKey, JSON.stringify(Array.from(triggeredSet)));
      setNotifications(getNotifications());
    }
  };

  // Initialize DB on mount and load data
  useEffect(() => {
    initDb();
    refreshAllData();
    checkForPendingTaskReminders();

    const interval = setInterval(() => {
      checkForPendingTaskReminders();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const refreshAllData = () => {
    setProjects(getProjects());
    setEntries(getJournalEntries());
    setTasks(getTasks());
    setIssues(getIssues());
    setContacts(getContacts());
    setNotifications(getNotifications());
  };

  // 1. ADD NEW PROJECT
  const handleAddProject = (pData: any) => {
    const newProject = addProject(pData);
    
    // Fallback tasks if none provided from contract
    const rTasks = pData.recurringTasks && pData.recurringTasks.length > 0
      ? pData.recurringTasks
      : [
          {
            title: "Przygotowanie rozliczeń finansowych",
            description: "Zgodnie z umową: przygotować i przekazać rozliczenia do 5. dnia roboczego każdego miesiąca.",
            dayOfMonth: 5
          },
          {
            title: "Przegląd techniczny i konserwacja",
            description: "Miesięczna kontrola sprawności szlabanów, fotokomórek, pętli indukcyjnych oraz terminali.",
            dayOfMonth: 20
          },
          {
            title: "Audyt i raportowanie zajętości",
            description: "Przygotowanie miesięcznego raportu transakcji kasowych i wysłanie do inwestora.",
            dayOfMonth: 28
          }
        ];

    generateMonthlyRecurringTasks(newProject.id, newProject.name, newProject.startDate, rTasks);
    refreshAllData();
  };

  // 2. QUICK ADD JOURNAL ENTRY WITH AI
  const handleSaveQuickEntry = (eData: {
    projectId: string;
    title: string;
    content: string;
    category: JournalCategory;
    priority: Priority;
    gps: { latitude: number; longitude: number; address: string } | null;
    photos: string[];
    documents: { name: string; type: string; url: string; size: string }[];
    audioUrl?: string;
    audioTranscription?: string;
    people: string[];
    createdTask: { title: string; assignedTo: string; dueDate: string } | null;
    createdIssue: { title: string; description: string; priority: Priority; assignedTo: string } | null;
  }) => {
    const savedEntry = addJournalEntry({
      projectId: eData.projectId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      author: 'Jan Kowalski (Dyrektor)',
      category: eData.category,
      title: eData.title,
      content: eData.content,
      priority: eData.priority,
      status: 'Aktywne',
      gps: eData.gps,
      photos: eData.photos,
      documents: eData.documents,
      audioUrl: eData.audioUrl || null,
      audioTranscription: eData.audioTranscription || null,
      people: eData.people,
      relatedTasks: []
    });

    if (eData.createdTask) {
      addTask({
        title: eData.createdTask.title,
        description: `Zadanie automatycznie wygenerowane z analizy wpisu: "${savedEntry.title}"`,
        projectId: eData.projectId,
        dueDate: eData.createdTask.dueDate,
        priority: eData.priority,
        status: 'todo',
        assignedTo: eData.createdTask.assignedTo,
        sourceEntryId: savedEntry.id
      });
    }

    if (eData.createdIssue) {
      addIssue({
        title: eData.createdIssue.title,
        description: eData.createdIssue.description,
        projectId: eData.projectId,
        date: new Date().toISOString().split('T')[0],
        priority: eData.createdIssue.priority,
        status: 'open',
        assignedTo: eData.createdIssue.assignedTo,
        photos: eData.photos,
        documents: eData.documents
      });
    }

    setShowAddModal(false);
    refreshAllData();
  };

  // 3. EDIT JOURNAL ENTRY
  const handleEditJournalEntry = (updated: JournalEntry) => {
    const list = getJournalEntries().map(e => e.id === updated.id ? updated : e);
    localStorage.setItem('pdp_journal', JSON.stringify(list));
    refreshAllData();
  };

  // 4. DELETE JOURNAL ENTRY
  const handleDeleteJournalEntry = (id: string) => {
    deleteJournalEntry(id);
    refreshAllData();
  };

  // 5. TOGGLE TASK COMPLETION
  const handleToggleTask = (id: string) => {
    toggleTaskCompleted(id);
    refreshAllData();
  };

  // 6. ADD MANUAL TASK
  const handleAddTaskManual = (tData: any) => {
    addTask(tData);
    refreshAllData();
  };

  // 7. DELETE TASK
  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    refreshAllData();
  };

  // 8. ADD MANUAL ISSUE
  const handleAddIssueManual = (iData: any) => {
    addIssue(iData);
    refreshAllData();
  };

  // 9. ADD MANUAL CONTACT
  const handleAddContactManual = (cData: any) => {
    addContact(cData);
    refreshAllData();
  };

  // 9b. UPDATE CONTACT
  const handleUpdateContact = (cData: Contact) => {
    updateContact(cData);
    refreshAllData();
  };

  // 9c. DELETE CONTACT
  const handleDeleteContact = (contactId: string) => {
    deleteContact(contactId);
    refreshAllData();
  };

  // 10. ADD DIRECT DOCUMENT FILE
  const handleAddDocumentDirect = (doc: any) => {
    addJournalEntry({
      projectId: selectedProjectId || projects[0]?.id,
      date: doc.addedDate,
      time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      author: doc.author,
      category: 'document',
      title: `Dodano plik: ${doc.name}`,
      content: doc.description || 'Nowy plik dołączony bezpośrednio do zasobów projektu.',
      priority: 'normal',
      status: 'Aktywne',
      gps: null,
      photos: [],
      documents: [{ name: doc.name, type: doc.type, url: doc.url, size: '2.4 MB' }],
      audioUrl: null,
      audioTranscription: null,
      people: [],
      relatedTasks: []
    });
    refreshAllData();
  };

  // 10b. DELETE DIRECT DOCUMENT FILE
  const handleDeleteDocument = (entryId: string, docIndex: number) => {
    deleteJournalEntryDocument(entryId, docIndex);
    refreshAllData();
  };

  // 10bb. BATCH DELETE DOCUMENTS FROM JOURNAL ENTRIES
  const handleDeleteDocuments = (items: { entryId: string; docIndex: number }[]) => {
    deleteJournalEntryDocuments(items);
    refreshAllData();
  };

  // 10c. DELETE SINGLE PHOTO FROM JOURNAL ENTRY
  const handleDeletePhoto = (entryId: string, photoIndex: number) => {
    deleteJournalEntryPhoto(entryId, photoIndex);
    refreshAllData();
  };

  // 10d. BATCH DELETE PHOTOS FROM JOURNAL ENTRIES
  const handleDeletePhotos = (items: { entryId: string; photoIndex: number }[]) => {
    deleteJournalEntryPhotos(items);
    refreshAllData();
  };

  // 10e. ADD PHOTOS TO PROJECT DIRECTLY
  const handleAddProjectPhotos = (projectId: string, urls: string[], caption?: string) => {
    addProjectPhotos(projectId, urls, caption);
    refreshAllData();
  };

  // 11. UPDATE PROJECT DATA
  const handleUpdateProject = (updatedProj: Project) => {
    updateProject(updatedProj);
    refreshAllData();
  };

  // 12. DELETE PROJECT ENTIRELY
  const handleDeleteProject = (projId: string) => {
    deleteProject(projId);
    setSelectedProjectId(null);
    refreshAllData();
  };

  // Live Search Input handler
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setSearchResults(globalSearch(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearchResultClick = (res: SearchResult) => {
    setSelectedProjectId(res.projectId);
    setShowSearchModal(false);
    setSearchQuery('');
  };

  const activeProject = projects.find(p => p.id === selectedProjectId);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleMarkNotificationRead = (id: string) => {
    markNotificationRead(id);
    refreshAllData();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    refreshAllData();
  };

  // Compute stats for Left Sidebar activity block
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntriesCount = entries.filter(e => e.date === todayStr).length;

  // Compute urgent upcoming tasks for Right Sidebar
  const upcomingUrgentTasks = tasks
    .filter(t => t.status !== 'done')
    .slice(0, 3);

  return (
    <div className="bg-[#0A0A0C] min-h-screen text-[#E0E0E6] font-sans flex antialiased overflow-hidden h-screen">
      
      {/* 1. LEFT SIDEBAR (Desktop navigation & quick project status) */}
      <aside className="w-72 border-r border-[#1F1F24] bg-[#0F0F12] p-6 hidden md:flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-900/20">
            P
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight text-white">Dziennik</h1>
            <span className="text-[10px] text-blue-500 font-extrabold uppercase tracking-widest">Parkingowy</span>
          </div>
        </div>

        {/* Tab Shortcuts inside left sidebar */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] uppercase tracking-widest text-[#666670] font-black mb-1.5">Nawigacja</p>
          <button
            onClick={() => { setSelectedProjectId(null); setCurrentTab('today'); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-3 ${
              currentTab === 'today' && !selectedProjectId ? 'bg-[#1C1C21] text-white border border-[#2C2C34]' : 'text-[#8E8E99] hover:text-white border border-transparent'
            }`}
          >
            <TodayIcon className="w-4 h-4" />
            Dzisiaj
          </button>
          <button
            onClick={() => { setSelectedProjectId(null); setCurrentTab('projects'); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-3 ${
              currentTab === 'projects' && !selectedProjectId ? 'bg-[#1C1C21] text-white border border-[#2C2C34]' : 'text-[#8E8E99] hover:text-white border border-transparent'
            }`}
          >
            <ProjectsIcon className="w-4 h-4" />
            Projekty ({projects.length})
          </button>
          <button
            onClick={() => { setSelectedProjectId(null); setCurrentTab('journal'); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-3 ${
              currentTab === 'journal' && !selectedProjectId ? 'bg-[#1C1C21] text-white border border-[#2C2C34]' : 'text-[#8E8E99] hover:text-white border border-transparent'
            }`}
          >
            <JournalIcon className="w-4 h-4" />
            Dziennik zdarzeń
          </button>
          <button
            onClick={() => { setSelectedProjectId(null); setCurrentTab('tasks'); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-3 ${
              currentTab === 'tasks' && !selectedProjectId ? 'bg-[#1C1C21] text-white border border-[#2C2C34]' : 'text-[#8E8E99] hover:text-white border border-transparent'
            }`}
          >
            <TasksIcon className="w-4 h-4" />
            Zadania ({tasks.filter(t => t.status !== 'done').length})
          </button>
        </div>

        {/* Dynamic Project Quicklist inside left sidebar */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-[#666670] font-black mb-1">Aktywne Projekty</p>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {projects.slice(0, 5).map(p => {
              const isActive = selectedProjectId === p.id;
              const openIssues = issues.filter(i => i.projectId === p.id && i.status === 'open').length;
              const statusColor = openIssues > 0 ? 'bg-red-500' : p.status === 'W budowie' ? 'bg-orange-500' : 'bg-green-500';
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition border text-left ${
                    isActive 
                      ? 'bg-[#1C1C21] border-[#2C2C34] text-white' 
                      : 'bg-transparent border-transparent text-[#8E8E99] hover:bg-[#16161B] hover:text-[#E0E0E6]'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-bold truncate leading-snug">{p.name}</span>
                    <span className="text-[9px] text-[#666670] truncate mt-0.5">{p.location}</span>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor} shadow-[0_0_6px_rgba(34,197,94,0.4)]`}></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today stats counter widget */}
        <div className="mt-auto p-4 bg-[#1C1C21]/50 border border-[#2C2C34] rounded-2xl">
          <p className="text-[10px] text-[#8E8E99] mb-1 font-bold uppercase tracking-wider">Dzisiejsza aktywność</p>
          <p className="text-lg font-black text-white">{todayEntriesCount} {todayEntriesCount === 1 ? 'Wpis' : todayEntriesCount > 1 && todayEntriesCount < 5 ? 'Wpisy' : 'Wpisów'}</p>
          <div className="w-full h-1 bg-[#2C2C34] rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min((todayEntriesCount / 5) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </aside>

      {/* 2. CENTER WORKSPACE (Renders header, active tab, details views inside high-fidelity container) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Universal Head Bar for mobile viewports OR general desktop overlay controls */}
        {!selectedProjectId && (
          <header className="bg-[#0F0F12] border-b border-[#1F1F24] px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm md:hidden">
                🅿️
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#666670]">Parkingowy Dziennik</span>
                <h1 className="text-xs md:text-sm font-black text-white leading-tight truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-none">
                  Dziennik Budowy & Serwisu
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Global Search trigger */}
              <button
                id="global-search-btn"
                onClick={() => setShowSearchModal(true)}
                className="w-8.5 h-8.5 rounded-xl hover:bg-[#16161B] flex items-center justify-center text-[#8E8E99] hover:text-white transition active:scale-95 border border-[#1F1F24]"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Notifications trigger with red badge */}
              <button
                id="notifications-center-btn"
                onClick={() => setShowNotificationsDrawer(true)}
                className="w-8.5 h-8.5 rounded-xl hover:bg-[#16161B] flex items-center justify-center text-[#8E8E99] hover:text-white transition relative active:scale-95 border border-[#1F1F24]"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#0F0F12]">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Quick voice/photo trigger on desktop head bar */}
              <button
                onClick={() => setShowAddModal(true)}
                className="hidden md:flex px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-900/10"
              >
                <Plus className="w-3.5 h-3.5" />
                Szybki Wpis
              </button>
            </div>
          </header>
        )}

        {/* View Router Render Area */}
        <div className={`flex-1 overflow-y-auto pb-24 md:pb-6 bg-[#0A0A0C] ${selectedProjectId && activeProject ? 'p-0' : 'p-2 sm:p-4 md:p-6'}`}>
          {selectedProjectId && activeProject ? (
            <ProjectDetails
              project={activeProject}
              journalEntries={entries.filter(e => e.projectId === selectedProjectId)}
              tasks={tasks.filter(t => t.projectId === selectedProjectId)}
              issues={issues.filter(i => i.projectId === selectedProjectId)}
              contacts={contacts.filter(c => c.projectId === selectedProjectId)}
              onBack={() => setSelectedProjectId(null)}
              onAddTask={handleAddTaskManual}
              onAddIssue={handleAddIssueManual}
              onAddContact={handleAddContactManual}
              onUpdateContact={handleUpdateContact}
              onDeleteContact={handleDeleteContact}
              onAddDocument={handleAddDocumentDirect}
              onDeleteDocument={handleDeleteDocument}
              onDeleteDocuments={handleDeleteDocuments}
              onDeletePhoto={handleDeletePhoto}
              onDeletePhotos={handleDeletePhotos}
              onAddPhotos={(urls, caption) => handleAddProjectPhotos(selectedProjectId, urls, caption)}
              onEditProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onAddJournalEntry={() => setShowAddModal(true)}
            />
          ) : (
            <>
              {currentTab === 'today' && (
                <Dashboard
                  projects={projects}
                  tasks={tasks}
                  issues={issues}
                  recentEntries={entries}
                  onSelectProject={setSelectedProjectId}
                  onNavigateToTab={setCurrentTab}
                />
              )}

              {currentTab === 'projects' && (
                <ProjectsScreen
                  projects={projects}
                  tasks={tasks}
                  issues={issues}
                  onSelectProject={setSelectedProjectId}
                  onAddProject={handleAddProject}
                />
              )}

              {currentTab === 'journal' && (
                <JournalScreen
                  entries={entries}
                  projects={projects}
                  onEditEntry={handleEditJournalEntry}
                  onDeleteEntry={handleDeleteJournalEntry}
                  onOpenAddModal={() => setShowAddModal(true)}
                />
              )}

              {currentTab === 'tasks' && (
                <TasksScreen
                  tasks={tasks}
                  projects={projects}
                  onToggleTask={handleToggleTask}
                  onAddTask={handleAddTaskManual}
                  onDeleteTask={handleDeleteTask}
                />
              )}
            </>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR FOR MOBILE (collapses on desktop screens) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0F0F12]/95 border-t border-[#1F1F24] py-1.5 px-3 flex justify-between items-center z-40 backdrop-blur-md rounded-t-2xl shadow-xl">
          <button
            id="nav-tab-today"
            onClick={() => { setSelectedProjectId(null); setCurrentTab('today'); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
              currentTab === 'today' && !selectedProjectId ? 'text-blue-500 font-bold' : 'text-[#8E8E99] hover:text-white'
            }`}
          >
            <TodayIcon className="w-5 h-5" />
            <span className="text-[10px] mt-1">Dziś</span>
          </button>

          <button
            id="nav-tab-projects"
            onClick={() => { setSelectedProjectId(null); setCurrentTab('projects'); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
              currentTab === 'projects' || selectedProjectId ? 'text-blue-500 font-bold' : 'text-[#8E8E99] hover:text-white'
            }`}
          >
            <ProjectsIcon className="w-5 h-5" />
            <span className="text-[10px] mt-1">Projekty</span>
          </button>

          <div className="flex-1 flex justify-center -translate-y-5">
            <button
              id="quick-add-entry-fab"
              onClick={() => setShowAddModal(true)}
              className="w-13 h-13 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-900/30 border-2 border-white/10 transition-all transform active:scale-90"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          <button
            id="nav-tab-journal"
            onClick={() => { setSelectedProjectId(null); setCurrentTab('journal'); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
              currentTab === 'journal' && !selectedProjectId ? 'text-blue-500 font-bold' : 'text-[#8E8E99] hover:text-white'
            }`}
          >
            <JournalIcon className="w-5 h-5" />
            <span className="text-[10px] mt-1">Dziennik</span>
          </button>

          <button
            id="nav-tab-tasks"
            onClick={() => { setSelectedProjectId(null); setCurrentTab('tasks'); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
              currentTab === 'tasks' && !selectedProjectId ? 'text-blue-500 font-bold' : 'text-[#8E8E99] hover:text-white'
            }`}
          >
            <TasksIcon className="w-5 h-5" />
            <span className="text-[10px] mt-1">Zadania</span>
          </button>
        </nav>
      </main>

      {/* 3. RIGHT SIDEBAR (AI Assistant listening card + upcoming deadlined tasks list) */}
      <aside className="w-80 border-l border-[#1F1F24] bg-[#0F0F12] p-6 hidden lg:flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
        {/* Dynamic AI Listening / Processing Status Card */}
        <div className="p-5 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Asystent AI</span>
          </div>
          <p className="text-xs italic text-[#B0B0C0] mb-4 font-medium leading-relaxed">
            &ldquo;Wykonawca ma do piątku przygotować wycenę fundamentów pod parkomaty.&rdquo;
          </p>
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
            <p className="text-[9px] font-black text-white uppercase tracking-wider">Sugestia systemu:</p>
            <div className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded-lg">
              <span className="text-[11px] text-blue-400 font-semibold">Utwórz Zadanie</span>
              <span className="text-[10px] bg-blue-600/20 text-blue-400 font-black px-1.5 py-0.5 rounded uppercase">TAK</span>
            </div>
            <div className="flex items-center justify-between text-[11px] px-1 pt-1">
              <span className="text-[#8E8E99]">Termin</span>
              <span className="text-white font-bold">Piątek (15.09)</span>
            </div>
            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-[#8E8E99]">Priorytet</span>
              <span className="text-orange-400 font-bold">Wysoki</span>
            </div>
          </div>
        </div>

        {/* Nearest Deadlines & Actions */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-[#666670] font-black">Najbliższe Terminy</p>
          <div className="space-y-3">
            {upcomingUrgentTasks.length > 0 ? (
              upcomingUrgentTasks.map(t => {
                const isHigh = t.priority === 'high' || t.priority === 'urgent';
                const indicatorColor = isHigh ? 'bg-orange-500' : 'bg-blue-500';
                return (
                  <div key={t.id} className="flex gap-3 items-start p-1.5 hover:bg-[#16161B] rounded-xl transition">
                    <div className={`w-1 h-9 ${indicatorColor} rounded-full shrink-0`}></div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-[#666670] font-medium mt-0.5 truncate">
                        Do: {t.dueDate}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#666670] italic">Wszystkie zadania wykonane!</p>
            )}
          </div>
        </div>

        {/* Footer controls inside right sidebar */}
        <div className="mt-auto flex flex-col gap-3">
          <button 
            onClick={() => alert("Ustawienia konta są dostępne w systemie produkcyjnym Android.")}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-xs font-bold transition-all text-[#E0E0E6] uppercase tracking-wider"
          >
            USTAWIENIA KONTA
          </button>
          <button 
            onClick={() => alert("Wylogowanie pomyślne.")}
            className="w-full py-2.5 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded-xl border border-red-500/20 text-xs font-bold transition-all uppercase tracking-wider"
          >
            WYLOGUJ
          </button>
        </div>
      </aside>

      {/* QUICK ADD MODAL SCREEN */}
      {showAddModal && (
        <AddEntryModal
          projects={projects}
          initialProjectId={selectedProjectId || undefined}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveQuickEntry}
        />
      )}

      {/* GLOBAL SEARCH SYSTEM OVERLAY */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-[#0A0A0C]/95 backdrop-blur-md z-50 p-4 sm:p-6 animate-fade-in max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-black text-white">Przeszukaj całą bazę danych</h3>
            <button 
              id="close-search-modal"
              onClick={() => { setShowSearchModal(false); setSearchQuery(''); }}
              className="w-8 h-8 rounded-full bg-[#1C1C21] flex items-center justify-center text-[#8E8E99] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-5">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-[#666670]" />
            <input
              id="global-search-input"
              autoFocus
              type="text"
              placeholder="Wpisz słowo kluczowe, usterkę, telefon, nazwisko..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-[#666670] outline-none transition"
            />
          </div>

          <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => handleSearchResultClick(res)}
                className="bg-[#16161B] border border-[#1C1C21] hover:border-[#2C2C34] p-3.5 rounded-xl cursor-pointer transition flex items-start gap-3"
              >
                <div className="w-7.5 h-7.5 rounded-lg bg-[#0A0A0C] flex items-center justify-center shrink-0 border border-[#1F1F24] text-xs">
                  {res.type === 'project' ? '🅿️' :
                   res.type === 'entry' ? '📝' :
                   res.type === 'task' ? '✅' :
                   res.type === 'issue' ? '⚠️' :
                   res.type === 'contact' ? '☎️' : '📄'}
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-blue-400 font-extrabold uppercase">{res.projectName}</span>
                    <span className="text-[9px] text-[#666670]">{res.date || ''}</span>
                  </div>
                  <h4 className="font-extrabold text-white truncate">{res.title}</h4>
                  <p className="text-[#8E8E99] text-[11px] font-medium mt-0.5">{res.subtitle}</p>
                  <p className="text-[#666670] text-[10px] mt-1.5 line-clamp-2 leading-relaxed italic border-l border-[#1F1F24] pl-2">
                    {res.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#666670] self-center shrink-0" />
              </div>
            ))}

            {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-12 text-[#666670] text-sm">
                Brak wyników wyszukiwania dla &ldquo;{searchQuery}&rdquo;.
              </div>
            )}

            {searchQuery.trim().length < 2 && (
              <div className="text-center py-12 text-[#666670] text-xs">
                Wpisz co najmniej 2 znaki, aby rozpocząć przeszukiwanie projektów, timelineów, dokumentów i kontaktów.
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS DRAWER OVERLAY */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#0F0F12] border-l border-[#1F1F24] w-full max-w-sm h-full flex flex-col shadow-2xl p-5">
            <div className="flex justify-between items-center pb-3 border-b border-[#1F1F24] mb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <Bell className="w-5 h-5 text-blue-500" />
                  Centrum Powiadomień
                </h3>
                <p className="text-[10px] text-[#666670] font-semibold uppercase tracking-wider">Lokalne alerty i usterki</p>
              </div>
              <button 
                onClick={() => setShowNotificationsDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#1C1C21] flex items-center justify-center text-[#8E8E99] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-right font-black text-blue-500 hover:text-blue-400 transition mb-3 uppercase tracking-wider"
              >
                Oznacz wszystkie jako przeczytane
              </button>
            )}

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleMarkNotificationRead(n.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    n.read 
                      ? 'bg-[#0A0A0C]/45 border-[#1F1F24] opacity-60' 
                      : n.type === 'error'
                        ? 'bg-red-950/10 border-red-900/30 text-red-200'
                        : n.type === 'warning'
                          ? 'bg-amber-950/10 border-amber-900/30 text-amber-200'
                          : 'bg-[#1C1C21] border-[#2C2C34]'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h4 className="font-extrabold text-xs text-white">{n.title}</h4>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>}
                  </div>
                  <p className="text-[11px] text-[#8E8E99] leading-relaxed">{n.message}</p>
                  <span className="text-[9px] text-[#666670] font-bold block mt-2">
                    {new Date(n.date).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-16 text-[#666670] text-xs">
                  Brak powiadomień technicznych.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
