import React, { useState } from 'react';
import { Project, Task, Issue, ProjectStatus } from '../types';
import { 
  Search, 
  MapPin, 
  Plus, 
  FolderOpen, 
  ChevronRight, 
  X,
  FileText,
  Briefcase,
  UploadCloud,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ProjectsScreenProps {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  onSelectProject: (id: string) => void;
  onAddProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function ProjectsScreen({
  projects,
  tasks,
  issues,
  onSelectProject,
  onAddProject
}: ProjectsScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<ProjectStatus>('OK');
  const [notes, setNotes] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [billingTerms, setBillingTerms] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [recurringTasks, setRecurringTasks] = useState<{ title: string; description: string; dayOfMonth: number }[]>([]);

  // PDF Contract upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Wybierz prawidłowy plik PDF z umową.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const response = await fetch('/api/analyze-contract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfBase64: base64,
            fileName: file.name,
            currentDate: new Date().toISOString().split('T')[0]
          }),
        });

        if (!response.ok) {
          throw new Error('Błąd połączenia z serwerem analizującym.');
        }

        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          const { 
            name: pName, 
            address: pAddress, 
            client: pClient, 
            startDate: pStartDate, 
            description: pDesc, 
            notes: pNotes,
            clientContact: pContact,
            billingTerms: pBilling,
            scopeOfWork: pScope,
            recurringTasks: pRecurring
          } = resJson.data;
          setName(pName || '');
          setAddress(pAddress || '');
          setClient(pClient || '');
          if (pStartDate) setStartDate(pStartDate);
          setDescription(pDesc || '');
          setNotes(pNotes || '');
          setClientContact(pContact || '');
          setBillingTerms(pBilling || '');
          setScopeOfWork(pScope || '');
          if (pRecurring && Array.isArray(pRecurring)) {
            setRecurringTasks(pRecurring);
          } else {
            setRecurringTasks([]);
          }
          setUploadSuccess(true);
          setUploadError('');
        } else {
          throw new Error('Nieprawidłowy format odpowiedzi z analizera.');
        }
      } catch (err: any) {
        console.error(err);
        setUploadError('Nie udało się przeanalizować umowy. Spróbuj ponownie lub uzupełnij pola ręcznie.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-500/10 text-green-500 border border-green-500/20">
            🟢 OK
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            🟠 UWAGA
          </span>
        );
      case 'PROBLEM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20">
            🔴 PROBLEM
          </span>
        );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;
    
    onAddProject({
      name,
      address,
      description,
      client,
      startDate,
      status,
      notes,
      clientContact,
      billingTerms,
      scopeOfWork,
      recurringTasks
    });

    // Reset form
    setName('');
    setAddress('');
    setClient('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setStatus('OK');
    setNotes('');
    setClientContact('');
    setBillingTerms('');
    setScopeOfWork('');
    setRecurringTasks([]);
    setUploadSuccess(false);
    setUploadError('');
    setIsAdding(false);
  };

  return (
    <div id="projects-screen" className="pb-24 px-4 pt-2 text-[#E0E0E6] max-w-lg mx-auto">
      
      {/* Header and Add Button */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-black text-white leading-tight">Projekty</h2>
          <p className="text-[#8E8E99] text-xs mt-0.5">Nadzór nad infrastrukturą parkingową</p>
        </div>
        <button
          id="open-add-project-modal"
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl flex items-center gap-1 font-extrabold text-[10px] shadow-lg shadow-blue-900/10 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          NOWY PROJEKT
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#666670]" />
          <input
            id="projects-search-input"
            type="text"
            placeholder="Szukaj projektu, adresu lub klienta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { value: 'all', label: 'Wszystkie' },
            { value: 'OK', label: '🟢 OK' },
            { value: 'WARNING', label: '🟠 Uwaga' },
            { value: 'PROBLEM', label: '🔴 Problemy' }
          ].map(btn => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition ${
                statusFilter === btn.value 
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10' 
                  : 'bg-[#1C1C21] text-[#8E8E99] border-[#2C2C34] hover:border-[#2C2C34]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {filteredProjects.map(p => {
          const projectTasks = tasks.filter(t => t.projectId === p.id && t.status !== 'done');
          const projectIssues = issues.filter(i => i.projectId === p.id && i.status !== 'resolved');

          return (
            <div
              id={`project-item-${p.id}`}
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className="bg-[#1C1C21] border border-[#2C2C34] hover:border-blue-500/20 rounded-2xl p-4 cursor-pointer transition flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-bold text-white text-sm truncate group-hover:text-blue-400 transition">{p.name}</h3>
                  {getStatusBadge(p.status)}
                </div>

                <p className="text-[11px] text-[#8E8E99] flex items-center gap-1 truncate mb-2.5">
                  <MapPin className="w-3.5 h-3.5 text-[#666670] shrink-0" />
                  {p.address}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-[#8E8E99]">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161B] border border-[#1C1C21]">
                    <strong className="text-white">{projectTasks.length}</strong> zadań
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#16161B] border border-[#1C1C21]">
                    <strong className="text-red-400">{projectIssues.length}</strong> problemy
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#16161B] border border-[#1C1C21] flex items-center justify-center text-[#8E8E99] group-hover:bg-blue-600/10 group-hover:text-blue-400 transition shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 bg-[#16161B]/30 border border-[#1C1C21] rounded-2xl">
            <Briefcase className="w-10 h-10 text-[#666670] mx-auto mb-2" />
            <p className="text-[#8E8E99] text-sm">Nie znaleziono żadnych projektów.</p>
            <p className="text-[#666670] text-xs mt-1">Zmień filtry lub dodaj nowy projekt przyciskiem powyżej.</p>
          </div>
        )}
      </div>

      {/* Add Project Modal overlay */}
      {isAdding && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#0F0F12] border-t sm:border border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-5 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <FolderOpen className="w-4 h-4 text-blue-500" />
                Dodaj Nowy Projekt
              </h3>
              <button 
                id="close-add-project-modal"
                onClick={() => {
                  setIsAdding(false);
                  setUploadSuccess(false);
                  setUploadError('');
                }}
                className="w-8 h-8 rounded-full bg-[#1C1C21] hover:bg-[#2C2C34] flex items-center justify-center text-[#8E8E99] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* PDF Uploader Zone */}
              <div className="bg-[#16161B]/50 border border-dashed border-[#2C2C34] rounded-xl p-4 text-center relative hover:border-blue-500/40 transition">
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-2">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-1.5" />
                    <p className="text-xs font-bold text-white animate-pulse">Analizowanie umowy przez Gemini AI...</p>
                    <p className="text-[10px] text-[#8E8E99] mt-0.5">Wyciągamy szczegóły i uzupełniamy formularz</p>
                  </div>
                ) : uploadSuccess ? (
                  <div className="flex flex-col items-center justify-center py-2 text-green-400">
                    <Sparkles className="w-6 h-6 mb-1" />
                    <p className="text-xs font-bold">Udało się! Dane zostały uzupełnione</p>
                    <p className="text-[10px] text-green-500/80 mt-0.5">Zweryfikuj pola formularza poniżej</p>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handlePdfUpload} 
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-1.5">
                        <UploadCloud className="w-4.5 h-4.5 text-blue-400" />
                      </div>
                      <p className="text-xs font-bold text-white">Szybkie uzupełnienie z umowy (PDF)</p>
                      <p className="text-[9px] text-[#666670] mt-1 font-semibold uppercase tracking-wider">
                        Kliknij lub przeciągnij plik PDF umowy, aby uzupełnić dane za pomocą AI
                      </p>
                    </div>
                  </label>
                )}
                {uploadError && (
                  <p className="text-[10px] text-red-400 mt-2 font-medium">{uploadError}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Nazwa Projektu *</label>
                <input
                  id="new-project-name"
                  type="text"
                  required
                  placeholder="np. Parking Podziemny Galeria"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Adres Lokalizacji *</label>
                <input
                  id="new-project-address"
                  type="text"
                  required
                  placeholder="np. Warszawa, ul. Towarowa 22"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Klient / Inwestor</label>
                <input
                  id="new-project-client"
                  type="text"
                  placeholder="np. Urząd Miasta Gdańska"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Data Rozpoczęcia</label>
                <input
                  id="new-project-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Status Początkowy</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['OK', 'WARNING', 'PROBLEM'] as ProjectStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        status === st 
                          ? st === 'OK' ? 'bg-green-500/10 border-green-500/30 text-green-500' 
                            : st === 'WARNING' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-[#1C1C21] text-[#8E8E99] border-[#2C2C34]'
                      }`}
                    >
                      {st === 'OK' ? '🟢 OK' : st === 'WARNING' ? '🟠 UWAGA' : '🔴 PROBLEM'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Opis projektu</label>
                <textarea
                  id="new-project-description"
                  rows={2}
                  placeholder="Krótki opis zakresu prac..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Notatki wewnętrzne</label>
                <textarea
                  id="new-project-notes"
                  rows={2}
                  placeholder="Wskazówki, klucze dostępu, uwagi techniczne..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Przedstawiciel i Kontakt Zamawiającego</label>
                <input
                  id="new-project-client-contact"
                  type="text"
                  placeholder="np. Jan Nowak (Inspektor), tel: +48 600 111 222, j.nowak@klient.pl"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Terminy Rozliczeń i Warunki Finansowe</label>
                <textarea
                  id="new-project-billing-terms"
                  rows={2}
                  placeholder="np. Płatność częściowa 30/70, termin płatności faktur 30 dni, gwarancja 3 lata..."
                  value={billingTerms}
                  onChange={(e) => setBillingTerms(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#666670] mb-1.5">Zakres Prac i Obowiązków Wykonawcy</label>
                <textarea
                  id="new-project-scope-work"
                  rows={2}
                  placeholder="np. Dostawa 4 kas, nacięcie pętli indukcyjnych, instalacja kamer LPR..."
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666670] outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setUploadSuccess(false);
                    setUploadError('');
                    setRecurringTasks([]);
                  }}
                  className="flex-1 bg-[#1C1C21] hover:bg-[#2C2C34] border border-[#2C2C34] py-3 rounded-xl text-xs font-bold text-[#E0E0E6] transition"
                >
                  Anuluj
                </button>
                <button
                  id="submit-new-project-btn"
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-900/10 transition"
                >
                  Utwórz Projekt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
