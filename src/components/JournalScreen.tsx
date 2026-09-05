import React, { useState } from 'react';
import { JournalEntry, Project, JournalCategory, Priority } from '../types';
import { downloadFile } from '../utils/fileStorage';
import { 
  Filter, 
  Search, 
  MapPin, 
  Calendar, 
  Trash2, 
  Edit2, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Volume2, 
  Download, 
  User, 
  AlertTriangle,
  Clock,
  X,
  FileText,
  Plus
} from 'lucide-react';

interface JournalScreenProps {
  entries: JournalEntry[];
  projects: Project[];
  onEditEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onOpenAddModal?: () => void;
}

export default function JournalScreen({
  entries,
  projects,
  onEditEntry,
  onDeleteEntry,
  onOpenAddModal
}: JournalScreenProps) {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Edit fields state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<JournalCategory>('note');
  const [editPriority, setEditPriority] = useState<Priority>('normal');

  const categories: { value: JournalCategory; label: string; emoji: string }[] = [
    { value: 'note', label: 'Notatka', emoji: '📝' },
    { value: 'meeting', label: 'Spotkanie', emoji: '🤝' },
    { value: 'contact', label: 'Kontakt', emoji: '☎️' },
    { value: 'issue', label: 'Problem', emoji: '⚠️' },
    { value: 'work', label: 'Praca', emoji: '🔧' },
    { value: 'done', label: 'Wykonane', emoji: '✅' },
    { value: 'decision', label: 'Ustalenie', emoji: '📅' },
    { value: 'document', label: 'Dokument', emoji: '📄' },
    { value: 'photo', label: 'Zdjęcie', emoji: '📷' },
    { value: 'info', label: 'Informacja', emoji: '💡' }
  ];

  const getCategoryDetails = (cat: JournalCategory) => {
    switch (cat) {
      case 'note': return { emoji: '📝', label: 'Notatka', color: 'bg-slate-800 text-[#E0E0E6] border-[#2C2C34]' };
      case 'meeting': return { emoji: '🤝', label: 'Spotkanie', color: 'bg-violet-950/40 text-violet-400 border-violet-900/30' };
      case 'contact': return { emoji: '☎️', label: 'Kontakt', color: 'bg-blue-950/40 text-blue-400 border-blue-900/30' };
      case 'issue': return { emoji: '⚠️', label: 'Problem', color: 'bg-red-950/40 text-red-400 border-red-900/30' };
      case 'work': return { emoji: '🔧', label: 'Praca', color: 'bg-blue-950/40 text-blue-400 border-blue-900/30' };
      case 'done': return { emoji: '✅', label: 'Wykonane', color: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' };
      case 'decision': return { emoji: '📅', label: 'Ustalenie', color: 'bg-amber-950/40 text-amber-400 border-amber-900/30' };
      case 'document': return { emoji: '📄', label: 'Dokument', color: 'bg-orange-950/40 text-orange-400 border-orange-900/30' };
      case 'photo': return { emoji: '📷', label: 'Zdjęcie', color: 'bg-pink-950/40 text-pink-400 border-pink-900/30' };
      case 'info': return { emoji: '💡', label: 'Informacja', color: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30' };
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'low': return <span className="text-[10px] px-2 py-0.5 rounded bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] font-bold uppercase">Niski</span>;
      case 'normal': return <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/20 border border-blue-900/30 text-blue-400 font-bold uppercase">Normalny</span>;
      case 'high': return <span className="text-[10px] px-2 py-0.5 rounded bg-orange-950/20 border border-orange-900/30 text-orange-400 font-bold uppercase">Wysoki</span>;
      case 'urgent': return <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/30 border border-red-900/50 text-red-400 font-bold uppercase animate-pulse">Pilny 🔴</span>;
    }
  };

  const handleEditClick = (e: JournalEntry) => {
    setEditingEntry(e);
    setEditTitle(e.title);
    setEditContent(e.content);
    setEditCategory(e.category);
    setEditPriority(e.priority);
  };

  const handleSaveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingEntry) return;

    onEditEntry({
      ...editingEntry,
      title: editTitle,
      content: editContent,
      category: editCategory,
      priority: editPriority
    });

    setEditingEntry(null);
  };

  const togglePlayAudio = (id: string) => {
    if (playingAudio === id) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(id);
      setTimeout(() => {
        setPlayingAudio(prev => prev === id ? null : prev);
      }, 8000);
    }
  };

  // Filter logic
  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      e.title.toLowerCase().includes(search.toLowerCase()) || 
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      (e.projectName && e.projectName.toLowerCase().includes(search.toLowerCase())) ||
      (e.author && e.author.toLowerCase().includes(search.toLowerCase())) ||
      (e.audioTranscription && e.audioTranscription.toLowerCase().includes(search.toLowerCase()));

    const matchesProject = projectFilter === 'all' || e.projectId === projectFilter;
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || e.priority === priorityFilter;

    let matchesDate = true;
    if (dateFrom && e.date < dateFrom) matchesDate = false;
    if (dateTo && e.date > dateTo) matchesDate = false;

    return matchesSearch && matchesProject && matchesCategory && matchesPriority && matchesDate;
  });

  return (
    <div id="journal-screen" className="pb-24 px-4 pt-2 text-[#E0E0E6] max-w-lg mx-auto">
      
      {/* Title */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-black text-white leading-tight">Dziennik</h2>
          <p className="text-[#8E8E99] text-xs mt-0.5">Chronologiczny zapis prac i zdarzeń</p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAddModal && (
            <button
              id="journal-add-entry-btn"
              onClick={onOpenAddModal}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Nowy wpis
            </button>
          )}
          <button
            id="toggle-filters-btn"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition text-[11px] font-black uppercase tracking-wider ${
              showFilters || projectFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all'
                ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                : 'bg-[#1C1C21] border-[#2C2C34] text-[#8E8E99] hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            FILTRY
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#666670]" />
        <input
          id="journal-search-input"
          type="text"
          placeholder="Szukaj we wpisach, transkrypcjach, autorach..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
        />
      </div>

      {/* Expandable Collapsible Filters Section */}
      {showFilters && (
        <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4 mb-5 space-y-4 animate-slide-down">
          <div className="flex justify-between items-center pb-2 border-b border-[#1C1C21]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">Filtrowanie zaawansowane</h3>
            <button
              onClick={() => {
                setProjectFilter('all');
                setCategoryFilter('all');
                setPriorityFilter('all');
                setDateFrom('');
                setDateTo('');
                setSearch('');
              }}
              className="text-[10px] text-blue-400 hover:text-blue-300 transition font-black uppercase tracking-widest"
            >
              WYCZYŚĆ FILTRY
            </button>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Projekt</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-lg p-2 text-xs outline-none"
              >
                <option value="all">Wszystkie projekty</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Kategoria</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-lg p-2 text-xs outline-none"
              >
                <option value="all">Wszystkie kategorie</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Priorytet</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-lg p-2 text-xs outline-none"
              >
                <option value="all">Wszystkie priorytety</option>
                <option value="low">Niski</option>
                <option value="normal">Normalny</option>
                <option value="high">Wysoki</option>
                <option value="urgent">Pilny</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Status wpisu</label>
              <select className="w-full bg-[#16161B] border border-[#1C1C21] text-[#666670] rounded-lg p-2 text-xs outline-none" disabled>
                <option>Wszystkie statusy</option>
              </select>
            </div>
          </div>

          <div className="border-t border-[#1C1C21] pt-3.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Zakres dat</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-lg p-2 text-xs outline-none"
              />
              <span className="text-[#666670] text-xs font-semibold">do</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-lg p-2 text-xs outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Timeline List */}
      <div className="space-y-4 relative">
        {/* Central timeline line */}
        <div className="absolute left-[18px] top-4 bottom-4 w-[1px] bg-[#2C2C34] z-0"></div>

        {filteredEntries.map(e => {
          const cat = getCategoryDetails(e.category) || { emoji: '📝', label: 'Notatka', color: 'bg-[#1C1C21]' };
          const isPlaying = playingAudio === e.id;

          return (
            <div 
              id={`journal-entry-card-${e.id}`}
              key={e.id} 
              className="flex gap-2.5 sm:gap-4 relative z-10 animate-fade-in"
            >
              {/* Timeline Icon */}
              <div className="w-9 h-9 rounded-lg bg-[#1C1C21] border border-[#2C2C34] flex items-center justify-center text-sm shadow-md shrink-0 self-start">
                {cat.emoji}
              </div>

              {/* Card content */}
              <div className="flex-1 bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-3.5 sm:p-4.5 shadow-xl hover:border-blue-500/20 transition">
                <div className="flex justify-between items-start mb-2.5 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border mb-1.5 ${cat.color}`}>
                      {cat.label}
                    </span>
                    <h3 className="font-extrabold text-white text-base leading-tight break-words">{e.title}</h3>
                    <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wide mt-0.5 break-words">{e.projectName}</p>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      id={`edit-entry-btn-${e.id}`}
                      onClick={() => handleEditClick(e)}
                      className="w-7 h-7 rounded-lg hover:bg-[#16161B] flex items-center justify-center text-[#8E8E99] hover:text-white transition border border-transparent hover:border-[#1C1C21]"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      id={`delete-entry-btn-${e.id}`}
                      onClick={() => {
                        if(confirm('Czy na pewno chcesz usunąć ten wpis z dziennika?')) {
                          onDeleteEntry(e.id);
                        }
                      }}
                      className="w-7 h-7 rounded-lg hover:bg-red-950/20 flex items-center justify-center text-[#666670] hover:text-red-400 transition border border-transparent hover:border-[#1C1C21]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-3 text-[11px] text-[#8E8E99] mb-3 bg-[#16161B] py-1 px-2.5 rounded-lg border border-[#1C1C21] w-fit">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#666670]" />
                    {e.date}
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#666670]" />
                    {e.time}
                  </span>
                  {getPriorityBadge(e.priority)}
                </div>

                {/* Entry content text */}
                <p className="text-[#E0E0E6] text-[13px] leading-relaxed mb-4 whitespace-pre-wrap font-medium">
                  {e.content}
                </p>

                {/* GPS Location badge */}
                {e.gps && (
                  <div className="flex items-center gap-1.5 text-xs text-[#8E8E99] mb-3 bg-[#16161B] p-2 rounded-xl border border-[#1C1C21]">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span className="break-words">
                      {e.gps.address || 
                        (typeof (e.gps as any)?.latitude === 'number' && typeof (e.gps as any)?.longitude === 'number'
                          ? `GPS: ${(e.gps as any).latitude.toFixed(4)}, ${(e.gps as any).longitude.toFixed(4)}`
                          : (typeof (e.gps as any)?.lat === 'number' && typeof (e.gps as any)?.lng === 'number'
                            ? `GPS: ${(e.gps as any).lat.toFixed(4)}, ${(e.gps as any).lng.toFixed(4)}`
                            : 'Współrzędne GPS'))}
                    </span>
                  </div>
                )}

                {/* Voice Note Player Segment */}
                {(e.audioUrl || e.audioTranscription) && (
                  <div className="mb-3.5 bg-[#16161B] border border-[#1C1C21] p-3.5 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-blue-400 tracking-widest flex items-center gap-1.5 uppercase">
                        <Volume2 className="w-3.5 h-3.5" />
                        NAGRANIE GŁOSOWE
                      </span>
                      {e.audioUrl && (
                        <button
                          onClick={() => togglePlayAudio(e.id)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 transition ${
                            isPlaying 
                              ? 'bg-orange-500/10 border border-orange-500/40 text-orange-400' 
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                          }`}
                        >
                          <Play className={`w-3 h-3 ${isPlaying ? 'animate-spin' : ''}`} />
                          {isPlaying ? 'ODTWARZANIE...' : 'ODTWÓRZ'}
                        </button>
                      )}
                    </div>
                    {/* Visualizer simulation */}
                    {isPlaying && (
                      <div className="flex items-center gap-1 h-6 mb-2 justify-center px-4">
                        {[3, 8, 5, 9, 2, 6, 4, 8, 5, 2, 7, 4, 9, 3, 6, 8, 2].map((h, i) => (
                          <span 
                            key={i} 
                            style={{ height: `${h * 10}%` }} 
                            className="w-1 bg-blue-500 rounded-full animate-pulse"
                          ></span>
                        ))}
                      </div>
                    )}
                    {e.audioTranscription && (
                      <div className="text-xs text-[#8E8E99] bg-[#0A0A0C]/50 p-2.5 rounded-lg border border-[#1C1C21] italic leading-relaxed">
                        &ldquo;{e.audioTranscription}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {/* Photos Grid */}
                {e.photos && e.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {e.photos.map((ph, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[#1C1C21] bg-[#16161B] group">
                        <img 
                          src={ph} 
                          alt="Projekt foto" 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Documents list */}
                {e.documents && e.documents.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {e.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#16161B] p-2.5 rounded-xl border border-[#1C1C21]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-orange-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-white font-bold break-words">{doc.name}</p>
                            <p className="text-[10px] text-[#666670]">{doc.size || 'Załącznik'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadFile(doc.name, doc.url, { projectName: e.projectName, date: e.date })}
                          className="w-7 h-7 rounded-lg hover:bg-[#1C1C21] flex items-center justify-center text-[#8E8E99] hover:text-blue-400 transition border border-transparent hover:border-[#2C2C34]"
                          title="Pobierz plik"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* People & Author */}
                <div className="border-t border-[#1C1C21] pt-3 flex flex-wrap justify-between items-center text-[11px] text-[#8E8E99] gap-2">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <User className="w-3.5 h-3.5 text-[#666670]" />
                    Autor: <strong className="text-white">{e.author || 'Jan Kowalski'}</strong>
                  </span>
                  
                  {e.people && e.people.length > 0 && (
                    <div className="flex gap-1 items-center">
                      <span className="text-[#666670] mr-1 font-semibold">Związani:</span>
                      {e.people.map((p, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-[#16161B] text-[#E0E0E6] border border-[#1C1C21] font-bold text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="text-center py-16 bg-[#16161B]/30 border border-[#1C1C21] rounded-2xl z-10 relative">
            <Calendar className="w-10 h-10 text-[#666670] mx-auto mb-2" />
            <p className="text-[#8E8E99] text-sm">Nie znaleziono żadnych wpisów.</p>
            <p className="text-[#666670] text-xs mt-1">Zmień kryteria wyszukiwania lub zresetuj filtry.</p>
          </div>
        )}
      </div>

      {/* Editing Entry Modal Overlay */}
      {editingEntry && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#0F0F12] border-t sm:border border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-5 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Edit2 className="w-4 h-4 text-blue-500" />
                Edytuj Wpis Dziennika
              </h3>
              <button 
                onClick={() => setEditingEntry(null)}
                className="w-8 h-8 rounded-full bg-[#1C1C21] hover:bg-[#2C2C34] flex items-center justify-center text-[#8E8E99] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Tytuł Wpisu *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Kategoria</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as JournalCategory)}
                  className="w-full bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500/50"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Priorytet</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                  className="w-full bg-[#16161B] border border-[#1C1C21] text-[#8E8E99] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500/50"
                >
                  <option value="low">Niski 🟢</option>
                  <option value="normal">Normalny 🟡</option>
                  <option value="high">Wysoki 🟠</option>
                  <option value="urgent">Pilny 🔴</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Treść Wpisu *</label>
                <textarea
                  rows={4}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 bg-[#1C1C21] hover:bg-[#2C2C34] border border-[#2C2C34] py-3 rounded-xl text-xs font-bold text-[#E0E0E6] transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/10 transition"
                >
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
