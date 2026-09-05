import { 
  Project, 
  JournalEntry, 
  Task, 
  Issue, 
  Contact, 
  AppNotification, 
  ProjectStatus, 
  Priority,
  JournalCategory,
  TaskStatus,
  IssueStatus,
  ContactRole
} from '../types';

// Storage keys
const PROJECTS_KEY = 'pdp_projects';
const JOURNAL_KEY = 'pdp_journal';
const TASKS_KEY = 'pdp_tasks';
const ISSUES_KEY = 'pdp_issues';
const CONTACTS_KEY = 'pdp_contacts';
const NOTIFICATIONS_KEY = 'pdp_notifications';

// Base64 SVGs to look like realistic parking scenes (high-quality visual cards)
const SVG_PARKOMET = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><circle cx="300" cy="200" r="120" fill="%230f172a" stroke="%2338bdf8" stroke-width="4"/><path d="M300 120 L300 280 M220 200 L380 200" stroke="%2338bdf8" stroke-width="8" stroke-linecap="round"/><rect x="250" y="160" width="100" height="80" rx="10" fill="%231e293b" stroke="%2338bdf8" stroke-width="4"/><text x="300" y="208" fill="%2338bdf8" font-family="sans-serif" font-weight="bold" font-size="24" text-anchor="middle">PARK</text></svg>';
const SVG_SZLABAN = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><rect x="80" y="280" width="80" height="120" fill="%23475569"/><rect x="100" y="80" width="40" height="200" fill="%23f59e0b"/><line x1="120" y1="120" x2="520" y2="120" stroke="%23ef4444" stroke-width="24" stroke-dasharray="40,20"/><circle cx="120" cy="120" r="16" fill="%231e293b"/></svg>';
const SVG_FUNDAMENT = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><rect x="150" y="250" width="300" height="100" fill="%2364748b" stroke="%2394a3b8" stroke-width="4"/><line x1="200" y1="250" x2="200" y2="150" stroke="%23f59e0b" stroke-width="8"/><line x1="400" y1="250" x2="400" y2="150" stroke="%23f59e0b" stroke-width="8"/><rect x="180" y="130" width="240" height="40" fill="%23f59e0b"/></svg>';

const SEED_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Parking Centrum',
    address: 'Warszawa, ul. Marszałkowska 102',
    description: 'Modernizacja i wymiana 15 parkomatów na system hybrydowy w ścisłym centrum handlowo-biznesowym.',
    client: 'Miejski Zarząd Dróg i Transportu w Warszawie',
    startDate: '2026-08-01',
    status: 'WARNING',
    notes: 'Kluczowy projekt referencyjny. Wykonawca ma opóźnienia z dostawą fundamentów prefabrykowanych.',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-05T14:32:00Z'
  },
  {
    id: 'p2',
    name: 'Parking Dworzec Główny',
    address: 'Kraków, pl. Jana Nowaka-Jeziorańskiego 3',
    description: 'Budowa systemu barierowego oraz automatycznych kas biletowych na parkingu wielopoziomowym przy stacji głównej PKP.',
    client: 'PKP Nieruchomości S.A.',
    startDate: '2026-08-15',
    status: 'OK',
    notes: 'Prace przebiegają zgodnie z harmonogramem. Dobry kontakt z administratorem technicznym stacji.',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-09-04T11:20:00Z'
  },
  {
    id: 'p3',
    name: 'Parking Galeria Lotnisko',
    address: 'Gdańsk, ul. Słowackiego 200',
    description: 'Wdrożenie kamer ANPR (rozpoznawanie tablic) na parkingu podziemnym oraz integracja z systemem biletowym.',
    client: 'Aerotropolis Retail Sp. z o.o.',
    startDate: '2026-09-01',
    status: 'PROBLEM',
    notes: 'Problem z zakłóceniami pętli indukcyjnej na wjeździe nr 2. Kamery ANPR gubią odczyty wieczorami.',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-05T10:15:00Z'
  }
];

const SEED_JOURNAL: JournalEntry[] = [
  {
    id: 'j1',
    projectId: 'p1',
    projectName: 'Parking Centrum',
    date: '2026-09-05',
    time: '14:32',
    author: 'Jan Kowalski (Dyrektor Projektu)',
    category: 'decision',
    title: 'Wymiana uszkodzonych parkomatów i fundamenty',
    content: 'Rozmawiałem z kierownikiem parkingu. Ustaliliśmy wymianę trzech uszkodzonych parkomatów. Wykonawca ma przygotować wycenę fundamentów do piątku.',
    priority: 'high',
    status: 'Aktywne',
    gps: { latitude: 52.2297, longitude: 21.0122, address: 'ul. Marszałkowska 102, Warszawa' },
    photos: [SVG_FUNDAMENT],
    documents: [
      { name: 'Specyfikacja_techniczna_fundamentow.pdf', type: 'pdf', url: '#', size: '1.2 MB' }
    ],
    audioUrl: null,
    audioTranscription: null,
    people: ['Dyrektor Zarządu', 'Kierownik Parkingu', 'Wykonawca'],
    relatedTasks: ['t1'],
    createdAt: '2026-09-05T14:32:00Z'
  },
  {
    id: 'j2',
    projectId: 'p1',
    projectName: 'Parking Centrum',
    date: '2026-09-03',
    time: '11:15',
    author: 'Jan Kowalski (Dyrektor Projektu)',
    category: 'issue',
    title: 'Opóźnienie dostawy urządzeń',
    content: 'Dostawca zgłosił opóźnienie w dostawie partii 5 parkomatów z powodu problemów logistycznych na granicy. Nowy termin to połowa przyszłego tygodnia.',
    priority: 'urgent',
    status: 'Zgłoszono',
    gps: { latitude: 52.2297, longitude: 21.0122 },
    photos: [],
    documents: [],
    audioUrl: null,
    audioTranscription: null,
    people: ['Dostawca urządzeń'],
    relatedTasks: ['t2'],
    createdAt: '2026-09-03T11:15:00Z'
  },
  {
    id: 'j3',
    projectId: 'p2',
    projectName: 'Parking Dworzec Główny',
    date: '2026-09-04',
    time: '09:00',
    author: 'Jan Kowalski (Dyrektor Projektu)',
    category: 'work',
    title: 'Instalacja pętli indukcyjnych pod szlabany',
    content: 'Zakończono frezowanie nawierzchni i układanie przewodów pętli indukcyjnej pod szlabany wjazdowe A i B. Pomiary rezystancji izolacji wypadły pomyślnie.',
    priority: 'normal',
    status: 'Ukończone',
    gps: { latitude: 50.0647, longitude: 19.9450, address: 'Dworzec Główny, Kraków' },
    photos: [SVG_SZLABAN],
    documents: [
      { name: 'Protokol_odbioru_petli.pdf', type: 'pdf', url: '#', size: '640 KB' }
    ],
    audioUrl: null,
    audioTranscription: null,
    people: ['Inżynier Robót', 'Inspektor PKP'],
    relatedTasks: [],
    createdAt: '2026-09-04T09:00:00Z'
  },
  {
    id: 'j4',
    projectId: 'p3',
    projectName: 'Parking Galeria Lotnisko',
    date: '2026-09-05',
    time: '10:00',
    author: 'Jan Kowalski (Dyrektor Projektu)',
    category: 'issue',
    title: 'Zakłócenia ANPR w nocy na wjeździe nr 2',
    content: 'Kamera ANPR gubi około 15% tablic rejestracyjnych po zmroku z powodu odbić od reflektorów samochodowych. Wymagana pilna korekta kąta nachylenia kamery oraz zmiana parametrów doświetlacza IR.',
    priority: 'urgent',
    status: 'W analizie',
    gps: { latitude: 54.3830, longitude: 18.4680 },
    photos: [SVG_PARKOMET],
    documents: [],
    audioUrl: null,
    audioTranscription: null,
    people: ['Serwisant ANPR', 'Ochrona Galerii'],
    relatedTasks: ['t3'],
    createdAt: '2026-09-05T10:00:00Z'
  },
  {
    id: 'j5',
    projectId: 'p2',
    projectName: 'Parking Dworzec Główny',
    date: '2026-08-20',
    time: '12:00',
    author: 'Jan Kowalski (Dyrektor Projektu)',
    category: 'meeting',
    title: 'Uzgodnienia lokalizacji kas automatycznych',
    content: 'Podczas wizji lokalnej z przedstawicielem PKP zatwierdzono ostateczną lokalizację 2 kas automatycznych przy wyjściu na perony 2 i 3.',
    priority: 'normal',
    status: 'Zatwierdzone',
    gps: { latitude: 50.0647, longitude: 19.9450 },
    photos: [],
    documents: [
      { name: 'Szkic_lokalizacji_kas.jpg', type: 'jpg', url: '#', size: '450 KB' }
    ],
    audioUrl: null,
    audioTranscription: null,
    people: ['Inspektor PKP', 'Dyrektor Stacji'],
    relatedTasks: [],
    createdAt: '2026-08-20T12:00:00Z'
  }
];

const SEED_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Przygotować wycenę fundamentów',
    description: 'Wykonawca ma przygotować wycenę oraz harmonogram montażu prefabrykowanych fundamentów pod parkomaty.',
    projectId: 'p1',
    projectName: 'Parking Centrum',
    dueDate: '2026-09-11', // Friday (current date is Sept 5, 2026 - Saturday)
    priority: 'normal',
    status: 'todo',
    assignedTo: 'Wykonawca (Zygmunt Bud)',
    createdAt: '2026-09-05T14:32:00Z',
    sourceEntryId: 'j1'
  },
  {
    id: 't2',
    title: 'Monitorowanie odprawy celnej urządzeń',
    description: 'Codzienny kontakt z agencją celną w celu przyspieszenia procedur dla opóźnionej dostawy 5 szt. parkomatów.',
    projectId: 'p1',
    projectName: 'Parking Centrum',
    dueDate: '2026-09-04', // Overdue (Sept 4 is Friday, today is Sept 5)
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'Dostawca (LogisPark)',
    createdAt: '2026-09-03T11:15:00Z',
    sourceEntryId: 'j2'
  },
  {
    id: 't3',
    title: 'Korekta kąta kamery ANPR wjazd 2',
    description: 'Regulacja fizyczna uchwytu oraz konfiguracja progu naświetlania IR w celu wyeliminowania odbić reflektorów.',
    projectId: 'p3',
    projectName: 'Parking Galeria Lotnisko',
    dueDate: '2026-09-06', // Tomorrow
    priority: 'urgent',
    status: 'todo',
    assignedTo: 'Serwisant (Tomasz Naprawa)',
    createdAt: '2026-09-05T10:00:00Z',
    sourceEntryId: 'j4'
  },
  {
    id: 't4',
    title: 'Zatwierdzenie planu zasilania kas',
    description: 'Przesłanie projektu przyłącza energetycznego kas do akceptacji przez inżyniera kontraktu.',
    projectId: 'p2',
    projectName: 'Parking Dworzec Główny',
    dueDate: '2026-09-03', // Overdue
    priority: 'normal',
    status: 'todo',
    assignedTo: 'Projektant (EkoPrąd Sp. z o.o.)',
    createdAt: '2026-08-20T12:00:00Z',
    sourceEntryId: null
  },
  {
    id: 't5',
    title: 'Podpisanie aneksu na dodatkowe okablowanie',
    description: 'Aneks na dodatkowe 120m kabla światłowodowego.',
    projectId: 'p2',
    projectName: 'Parking Dworzec Główny',
    dueDate: '2026-09-05', // Today
    priority: 'low',
    status: 'done',
    assignedTo: 'Jan Kowalski (Dyrektor Projektu)',
    createdAt: '2026-09-01T08:00:00Z',
    sourceEntryId: null
  }
];

const SEED_ISSUES: Issue[] = [
  {
    id: 'is1',
    title: 'Brak fundamentów parkomatów',
    description: 'Opóźnienia w produkcji prefabrykatów betonowych pod 3 parkomaty w strefie A.',
    projectId: 'p1',
    projectName: 'Parking Centrum',
    date: '2026-09-05',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'Zygmunt Bud (Wykonawca)',
    photos: [SVG_FUNDAMENT],
    documents: [],
    history: [
      { id: 'h1', date: '2026-09-05 14:32', action: 'Zgłoszono problem na podstawie rozmowy telefonicznej', user: 'Jan Kowalski' }
    ],
    createdAt: '2026-09-05T14:32:00Z'
  },
  {
    id: 'is2',
    title: 'Zakłócenia kamer ANPR (Wjazd 2)',
    description: 'Kamery niepoprawnie rozpoznają tablice rejestracyjne po zmroku przy intensywnych światłach mijania samochodów.',
    projectId: 'p3',
    projectName: 'Parking Galeria Lotnisko',
    date: '2026-09-05',
    priority: 'urgent',
    status: 'open',
    assignedTo: 'Tomasz Naprawa (Serwis)',
    photos: [SVG_PARKOMET],
    documents: [],
    history: [
      { id: 'h2', date: '2026-09-05 10:00', action: 'Utworzenie problemu na podstawie odczytu raportu błędu', user: 'Jan Kowalski' }
    ],
    createdAt: '2026-09-05T10:00:00Z'
  }
];

const SEED_CONTACTS: Contact[] = [
  {
    id: 'c1',
    projectId: 'p1',
    name: 'Andrzej Grabowski',
    company: 'Miejski Zarząd Dróg',
    role: 'Klient',
    position: 'Główny Inżynier Ruchu',
    phone: '+48 601 234 567',
    email: 'a.grabowski@mzd.warszawa.pl',
    notes: 'Kluczowy kontakt decyzyjny. Preferuje kontakt mailowy, na telefony odpowiada głównie rano.',
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'c2',
    projectId: 'p1',
    name: 'Zbigniew Nowak',
    company: 'Zygmunt Bud Sp. z o.o.',
    role: 'Wykonawca',
    position: 'Kierownik Budowy',
    phone: '+48 502 987 654',
    email: 'z.nowak@zygmuntbud.pl',
    notes: 'Odpowiedzialny za prace ziemne i fundamenty.',
    createdAt: '2026-08-01T08:05:00Z'
  },
  {
    id: 'c3',
    projectId: 'p2',
    name: 'Marek Wiśniewski',
    company: 'PKP Nieruchomości S.A.',
    role: 'Kierownik parkingu',
    position: 'Zawiadowca Stacji / Administrator Parkingu',
    phone: '+48 713 555 123',
    email: 'm.wisniewski@pkp-krakow.pl',
    notes: 'Bardzo pomocny, udostępnia pomieszczenia techniczne i zasilanie bez zbędnej biurokracji.',
    createdAt: '2026-08-15T09:00:00Z'
  },
  {
    id: 'c4',
    projectId: 'p3',
    name: 'Krystyna Janda',
    company: 'Aerotropolis Retail Gdańsk',
    role: 'Administracja',
    position: 'Menedżer Operacyjny Centrum',
    phone: '+48 58 300 40 50',
    email: 'k.janda@galerialotnisko.pl',
    notes: 'Wymaga częstych raportów postępu prac pod rygorem kar umownych.',
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'c5',
    projectId: 'p3',
    name: 'Tomasz Naprawa',
    company: 'SerwisPark Gdańsk',
    role: 'Serwis',
    position: 'Główny Serwisant Systemów LPR',
    phone: '+48 888 112 233',
    email: 't.naprawa@serwispark-gdansk.pl',
    notes: 'Ekspert od kamer ANPR/LPR i pętli indukcyjnych.',
    createdAt: '2026-09-01T10:15:00Z'
  }
];

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'Przeterminowane zadanie!',
    message: 'Zadanie "Monitorowanie odprawy celnej urządzeń" (Parking Centrum) miało termin na wczoraj.',
    type: 'error',
    date: '2026-09-05T08:00:00Z',
    read: false
  },
  {
    id: 'n2',
    title: 'Pilny problem wymagający uwagi',
    message: 'Zgłoszono błąd: "Zakłócenia kamer ANPR (Wjazd 2)" w projekcie Parking Galeria Lotnisko.',
    type: 'warning',
    date: '2026-09-05T10:05:00Z',
    read: false
  }
];

// Database initializing helper
export function initDb() {
  if (!localStorage.getItem(PROJECTS_KEY)) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(SEED_PROJECTS));
  }
  if (!localStorage.getItem(JOURNAL_KEY)) {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(SEED_JOURNAL));
  }
  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(SEED_TASKS));
  }
  if (!localStorage.getItem(ISSUES_KEY)) {
    localStorage.setItem(ISSUES_KEY, JSON.stringify(SEED_ISSUES));
  }
  if (!localStorage.getItem(CONTACTS_KEY)) {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(SEED_CONTACTS));
  }
  if (!localStorage.getItem(NOTIFICATIONS_KEY)) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(SEED_NOTIFICATIONS));
  }
}

// Low-level helper functions
function getData<T>(key: string): T[] {
  initDb();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// PROJECTS
export const getProjects = (): Project[] => getData<Project>(PROJECTS_KEY);
export const getProjectById = (id: string): Project | undefined => 
  getProjects().find(p => p.id === id);

export const addProject = (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
  const projects = getProjects();
  const newProject: Project = {
    ...project,
    id: 'project_' + Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  projects.push(newProject);
  saveData(PROJECTS_KEY, projects);
  return newProject;
};

export const updateProject = (project: Project): Project => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  if (index !== -1) {
    projects[index] = {
      ...project,
      updatedAt: new Date().toISOString()
    };
    saveData(PROJECTS_KEY, projects);
  }
  return project;
};

export const deleteProject = (id: string): void => {
  const projects = getProjects().filter(p => p.id !== id);
  saveData(PROJECTS_KEY, projects);
  
  // Clean up references (cascade)
  const entries = getJournalEntries().filter(e => e.projectId !== id);
  saveData(JOURNAL_KEY, entries);
  
  const tasks = getTasks().filter(t => t.projectId !== id);
  saveData(TASKS_KEY, tasks);
  
  const issues = getIssues().filter(i => i.projectId !== id);
  saveData(ISSUES_KEY, issues);
  
  const contacts = getContacts().filter(c => c.projectId !== id);
  saveData(CONTACTS_KEY, contacts);
};

// JOURNAL ENTRIES
export const getJournalEntries = (): JournalEntry[] => {
  const entries = getData<JournalEntry>(JOURNAL_KEY);
  const projects = getProjects();
  // Ensure projectName is populated
  return entries.map(e => ({
    ...e,
    projectName: e.projectName || projects.find(p => p.id === e.projectId)?.name || 'Nieznany Projekt'
  })).sort((a, b) => {
    // Sort descending by date and time
    const aDate = `${a.date}T${a.time}`;
    const bDate = `${b.date}T${b.time}`;
    return bDate.localeCompare(aDate);
  });
};

export const getProjectJournalEntries = (projectId: string): JournalEntry[] => 
  getJournalEntries().filter(e => e.projectId === projectId);

export const getJournalEntryById = (id: string): JournalEntry | undefined => 
  getJournalEntries().find(e => e.id === id);

export const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'projectName'>): JournalEntry => {
  const entries = getData<JournalEntry>(JOURNAL_KEY);
  const project = getProjectById(entry.projectId);
  const newEntry: JournalEntry = {
    ...entry,
    id: 'entry_' + Date.now(),
    projectName: project?.name || 'Nieznany Projekt',
    createdAt: new Date().toISOString()
  };
  entries.push(newEntry);
  saveData(JOURNAL_KEY, entries);

  // If entry category is 'issue' or 'decision', check if we need to auto-update project status
  if (entry.category === 'issue' && project && project.status === 'OK') {
    project.status = 'WARNING';
    updateProject(project);
  }

  // Also add activity log notification
  addNotification({
    title: 'Nowy wpis w dzienniku',
    message: `Dodano wpis "${newEntry.title}" w projekcie ${newEntry.projectName}.`,
    type: 'success'
  });

  return newEntry;
};

export const updateJournalEntry = (entry: JournalEntry): JournalEntry => {
  const entries = getData<JournalEntry>(JOURNAL_KEY);
  const index = entries.findIndex(e => e.id === entry.id);
  if (index !== -1) {
    entries[index] = entry;
    saveData(JOURNAL_KEY, entries);
  }
  return entry;
};

export const deleteJournalEntry = (id: string): void => {
  const entries = getData<JournalEntry>(JOURNAL_KEY).filter(e => e.id !== id);
  saveData(JOURNAL_KEY, entries);
};

export const deleteJournalEntryDocument = (entryId: string, docIndex: number): void => {
  const entries = getData<JournalEntry>(JOURNAL_KEY);
  const index = entries.findIndex(e => e.id === entryId);
  if (index !== -1) {
    const entry = entries[index];
    if (entry.documents && entry.documents.length > 0) {
      if (entry.category === 'document' && entry.documents.length <= 1) {
        deleteJournalEntry(entryId);
        return;
      }
      entry.documents.splice(docIndex, 1);
      saveData(JOURNAL_KEY, entries);
    }
  }
};

export const deleteJournalEntryDocuments = (items: { entryId: string; docIndex: number }[]): void => {
  const sorted = [...items].sort((a, b) => {
    if (a.entryId === b.entryId) {
      return b.docIndex - a.docIndex;
    }
    return a.entryId.localeCompare(b.entryId);
  });

  const entries = getData<JournalEntry>(JOURNAL_KEY);
  for (const item of sorted) {
    const index = entries.findIndex(e => e.id === item.entryId);
    if (index !== -1) {
      const entry = entries[index];
      if (entry.documents && item.docIndex < entry.documents.length) {
        entry.documents.splice(item.docIndex, 1);
      }
    }
  }
  const cleaned = entries.filter(e => !(e.category === 'document' && (!e.documents || e.documents.length === 0) && (!e.content || e.content.trim() === '')));
  saveData(JOURNAL_KEY, cleaned);
};

export const deleteJournalEntryPhoto = (entryId: string, photoIndex: number): void => {
  const entries = getData<JournalEntry>(JOURNAL_KEY);
  const index = entries.findIndex(e => e.id === entryId);
  if (index !== -1) {
    const entry = entries[index];
    if (entry.photos && entry.photos.length > 0) {
      if (entry.category === 'photo' && entry.photos.length <= 1 && (!entry.content || entry.content.trim() === '')) {
        deleteJournalEntry(entryId);
        return;
      }
      entry.photos.splice(photoIndex, 1);
      saveData(JOURNAL_KEY, entries);
    }
  }
};

export const deleteJournalEntryPhotos = (items: { entryId: string; photoIndex: number }[]): void => {
  const sorted = [...items].sort((a, b) => {
    if (a.entryId === b.entryId) {
      return b.photoIndex - a.photoIndex;
    }
    return a.entryId.localeCompare(b.entryId);
  });

  const entries = getData<JournalEntry>(JOURNAL_KEY);
  for (const item of sorted) {
    const index = entries.findIndex(e => e.id === item.entryId);
    if (index !== -1) {
      const entry = entries[index];
      if (entry.photos && item.photoIndex < entry.photos.length) {
        entry.photos.splice(item.photoIndex, 1);
      }
    }
  }
  const cleaned = entries.filter(e => !(e.category === 'photo' && (!e.photos || e.photos.length === 0) && (!e.content || e.content.trim() === '')));
  saveData(JOURNAL_KEY, cleaned);
};

export const addProjectPhotos = (projectId: string, photoUrls: string[], caption?: string): JournalEntry => {
  const project = getProjectById(projectId);
  return addJournalEntry({
    projectId,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    author: 'Jan Kowalski (Dyrektor)',
    category: 'photo',
    title: caption || `Dokumentacja fotograficzna (${photoUrls.length} ${photoUrls.length === 1 ? 'zdjęcie' : 'zdjęcia'})`,
    content: caption ? `Dodano zdjęcia: ${caption}` : `Dodano ${photoUrls.length} nowe zdjęcia do galerii projektu ${project?.name || ''}.`,
    priority: 'normal',
    status: 'Aktywne',
    gps: null,
    photos: photoUrls,
    documents: [],
    audioUrl: null,
    audioTranscription: null,
    people: [],
    relatedTasks: []
  });
};

// TASKS
export const getTasks = (): Task[] => {
  const tasks = getData<Task>(TASKS_KEY);
  const projects = getProjects();
  return tasks.map(t => ({
    ...t,
    projectName: t.projectName || projects.find(p => p.id === t.projectId)?.name || 'Nieznany Projekt'
  }));
};

export const getProjectTasks = (projectId: string): Task[] => 
  getTasks().filter(t => t.projectId === projectId);

export const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'projectName'>): Task => {
  const tasks = getData<Task>(TASKS_KEY);
  const project = getProjectById(task.projectId);
  const newTask: Task = {
    ...task,
    id: 'task_' + Date.now(),
    projectName: project?.name || 'Nieznany Projekt',
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  saveData(TASKS_KEY, tasks);

  // If it is urgent, add a notification
  if (newTask.priority === 'urgent' || newTask.priority === 'high') {
    addNotification({
      title: 'Pilne zadanie utworzone',
      message: `Zadanie "${newTask.title}" dla ${newTask.projectName} wymaga uwagi do ${newTask.dueDate}.`,
      type: 'warning'
    });
  }

  return newTask;
};

export const updateTask = (task: Task): Task => {
  const tasks = getData<Task>(TASKS_KEY);
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
    saveData(TASKS_KEY, tasks);
  }
  return task;
};

export const deleteTask = (id: string): void => {
  const tasks = getData<Task>(TASKS_KEY).filter(t => t.id !== id);
  saveData(TASKS_KEY, tasks);
};

export const toggleTaskCompleted = (id: string): Task | null => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    const task = tasks[index];
    task.status = task.status === 'done' ? 'todo' : 'done';
    saveData(TASKS_KEY, tasks);
    return task;
  }
  return null;
};

// ISSUES (PROBLEMS)
export const getIssues = (): Issue[] => {
  const issues = getData<Issue>(ISSUES_KEY);
  const projects = getProjects();
  return issues.map(i => ({
    ...i,
    projectName: i.projectName || projects.find(p => p.id === i.projectId)?.name || 'Nieznany Projekt'
  }));
};

export const getProjectIssues = (projectId: string): Issue[] => 
  getIssues().filter(i => i.projectId === projectId);

export const addIssue = (issue: Omit<Issue, 'id' | 'createdAt' | 'projectName' | 'history'>): Issue => {
  const issues = getData<Issue>(ISSUES_KEY);
  const project = getProjectById(issue.projectId);
  const newIssue: Issue = {
    ...issue,
    id: 'issue_' + Date.now(),
    projectName: project?.name || 'Nieznany Projekt',
    history: [
      {
        id: 'h_' + Date.now(),
        date: new Date().toLocaleDateString('pl-PL') + ' ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        action: 'Zgłoszono problem w systemie',
        user: 'Użytkownik'
      }
    ],
    createdAt: new Date().toISOString()
  };
  issues.push(newIssue);
  saveData(ISSUES_KEY, issues);

  // Auto-set project status to PROBLEM if it's urgent/high, else WARNING
  if (project) {
    project.status = newIssue.priority === 'urgent' ? 'PROBLEM' : 'WARNING';
    updateProject(project);
  }

  addNotification({
    title: 'Zgłoszono nowy problem',
    message: `Nowy problem "${newIssue.title}" w projekcie ${newIssue.projectName}.`,
    type: newIssue.priority === 'urgent' ? 'error' : 'warning'
  });

  return newIssue;
};

export const updateIssue = (issue: Issue): Issue => {
  const issues = getData<Issue>(ISSUES_KEY);
  const index = issues.findIndex(i => i.id === issue.id);
  if (index !== -1) {
    issues[index] = issue;
    saveData(ISSUES_KEY, issues);
  }
  return issue;
};

export const deleteIssue = (id: string): void => {
  const issues = getData<Issue>(ISSUES_KEY).filter(i => i.id !== id);
  saveData(ISSUES_KEY, issues);
};

export const addIssueHistory = (issueId: string, action: string, user: string): Issue | null => {
  const issues = getIssues();
  const index = issues.findIndex(i => i.id === issueId);
  if (index !== -1) {
    const issue = issues[index];
    issue.history.push({
      id: 'h_' + Date.now(),
      date: new Date().toLocaleDateString('pl-PL') + ' ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      action,
      user
    });
    saveData(ISSUES_KEY, issues);
    return issue;
  }
  return null;
};

// CONTACTS
export const getContacts = (): Contact[] => getData<Contact>(CONTACTS_KEY);
export const getProjectContacts = (projectId: string): Contact[] => 
  getContacts().filter(c => c.projectId === projectId);

export const addContact = (contact: Omit<Contact, 'id' | 'createdAt'>): Contact => {
  const contacts = getContacts();
  const newContact: Contact = {
    ...contact,
    id: 'contact_' + Date.now(),
    createdAt: new Date().toISOString()
  };
  contacts.push(newContact);
  saveData(CONTACTS_KEY, contacts);
  return newContact;
};

export const updateContact = (contact: Contact): Contact => {
  const contacts = getContacts();
  const index = contacts.findIndex(c => c.id === contact.id);
  if (index !== -1) {
    contacts[index] = contact;
    saveData(CONTACTS_KEY, contacts);
  }
  return contact;
};

export const deleteContact = (id: string): void => {
  const contacts = getContacts().filter(c => c.id !== id);
  saveData(CONTACTS_KEY, contacts);
};

// NOTIFICATIONS
export const getNotifications = (): AppNotification[] => getData<AppNotification>(NOTIFICATIONS_KEY);
export const addNotification = (notif: Omit<AppNotification, 'id' | 'date' | 'read'>): AppNotification => {
  const list = getNotifications();
  const newNotif: AppNotification = {
    ...notif,
    id: 'notif_' + Date.now(),
    date: new Date().toISOString(),
    read: false
  };
  list.unshift(newNotif);
  // Keep only last 20 notifications
  const trimmed = list.slice(0, 20);
  saveData(NOTIFICATIONS_KEY, trimmed);
  return newNotif;
};
export const markNotificationRead = (id: string): void => {
  const list = getNotifications();
  const index = list.findIndex(n => n.id === id);
  if (index !== -1) {
    list[index].read = true;
    saveData(NOTIFICATIONS_KEY, list);
  }
};
export const markAllNotificationsRead = (): void => {
  const list = getNotifications().map(n => ({ ...n, read: true }));
  saveData(NOTIFICATIONS_KEY, list);
};

// GLOBAL SEARCH
export interface SearchResult {
  type: 'project' | 'entry' | 'task' | 'issue' | 'contact' | 'document';
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  subtitle: string;
  description: string;
  date?: string;
  statusColor?: string;
}

export const globalSearch = (query: string): SearchResult[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: SearchResult[] = [];
  const projects = getProjects();
  const entries = getJournalEntries();
  const tasks = getTasks();
  const issues = getIssues();
  const contacts = getContacts();

  // 1. Projects
  projects.forEach(p => {
    if (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.notes.toLowerCase().includes(q)
    ) {
      results.push({
        type: 'project',
        id: p.id,
        projectId: p.id,
        projectName: p.name,
        title: p.name,
        subtitle: p.address,
        description: p.description,
        statusColor: p.status === 'OK' ? 'text-emerald-500' : p.status === 'WARNING' ? 'text-amber-500' : 'text-rose-500'
      });
    }
  });

  // 2. Journal entries (including documents within entries)
  entries.forEach(e => {
    const hasInEntryText = 
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      (e.author && e.author.toLowerCase().includes(q)) ||
      (e.people && e.people.some(p => p.toLowerCase().includes(q))) ||
      (e.audioTranscription && e.audioTranscription.toLowerCase().includes(q));

    if (hasInEntryText) {
      results.push({
        type: 'entry',
        id: e.id,
        projectId: e.projectId,
        projectName: e.projectName || '',
        title: e.title,
        subtitle: `Wpis Dziennika (${e.category}) - ${e.date} ${e.time}`,
        description: e.content,
        date: e.date
      });
    }

    // Documents inside entries
    e.documents.forEach(doc => {
      if (doc.name.toLowerCase().includes(q)) {
        results.push({
          type: 'document',
          id: `${e.id}_doc_${doc.name}`,
          projectId: e.projectId,
          projectName: e.projectName || '',
          title: doc.name,
          subtitle: `Dokument (${doc.type.toUpperCase()}) we wpisie: ${e.title}`,
          description: `Załączony plik o rozmiarze ${doc.size || 'N/A'}. Dodany przez: ${e.author}`,
          date: e.date
        });
      }
    });
  });

  // 3. Tasks
  tasks.forEach(t => {
    if (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.assignedTo.toLowerCase().includes(q)
    ) {
      results.push({
        type: 'task',
        id: t.id,
        projectId: t.projectId,
        projectName: t.projectName || '',
        title: t.title,
        subtitle: `Zadanie - Termin: ${t.dueDate} [Status: ${t.status.toUpperCase()}]`,
        description: t.description,
        date: t.dueDate
      });
    }
  });

  // 4. Issues
  issues.forEach(is => {
    if (
      is.title.toLowerCase().includes(q) ||
      is.description.toLowerCase().includes(q) ||
      is.assignedTo.toLowerCase().includes(q)
    ) {
      results.push({
        type: 'issue',
        id: is.id,
        projectId: is.projectId,
        projectName: is.projectName || '',
        title: is.title,
        subtitle: `Problem (${is.priority}) - [Status: ${is.status.toUpperCase()}]`,
        description: is.description,
        date: is.date
      });
    }
  });

  // 5. Contacts
  contacts.forEach(c => {
    const project = projects.find(p => p.id === c.projectId);
    if (
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.position.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.notes.toLowerCase().includes(q)
    ) {
      results.push({
        type: 'contact',
        id: c.id,
        projectId: c.projectId,
        projectName: project?.name || 'Wspólny',
        title: c.name,
        subtitle: `${c.role} - ${c.company} (${c.position})`,
        description: `Tel: ${c.phone} | E-mail: ${c.email} \nNotatka: ${c.notes}`
      });
    }
  });

  return results;
};

// CHRONOLOGICAL TIMELINE GENERATION FOR A PROJECT
export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'start' | 'entry' | 'task' | 'issue' | 'other';
  title: string;
  description: string;
  category?: JournalCategory;
  categoryIcon?: string;
  author?: string;
  priority?: Priority;
  statusLabel?: string;
}

export const getProjectTimeline = (projectId: string): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const project = getProjectById(projectId);
  if (!project) return [];

  // 1. Start event
  events.push({
    id: `p_start_${project.id}`,
    date: project.startDate,
    type: 'start',
    title: 'Rozpoczęcie projektu',
    description: `Projekt "${project.name}" został oficjalnie zainicjowany dla klienta: ${project.client}.`
  });

  // 2. Journal entries
  const entries = getProjectJournalEntries(projectId);
  entries.forEach(e => {
    events.push({
      id: `timeline_entry_${e.id}`,
      date: e.date,
      time: e.time,
      type: 'entry',
      title: e.title,
      description: e.content,
      category: e.category,
      author: e.author,
      priority: e.priority,
      statusLabel: e.status
    });
  });

  // Sort chronologically (ascending, older on bottom, newer on top or according to view toggle)
  return events.sort((a, b) => {
    const aDateTime = a.time ? `${a.date}T${a.time}` : `${a.date}T00:00`;
    const bDateTime = b.time ? `${b.date}T${b.time}` : `${b.date}T00:00`;
    return bDateTime.localeCompare(aDateTime); // default descending (newest first)
  });
};

// REPORT GENERATION
export interface ProjectReport {
  project: Project;
  generatedAt: string;
  stats: {
    totalEntries: number;
    openTasks: number;
    completedTasks: number;
    openIssues: number;
  };
  journal: JournalEntry[];
  tasks: Task[];
  issues: Issue[];
  contacts: Contact[];
}

export const generateReportData = (projectId: string): ProjectReport | null => {
  const project = getProjectById(projectId);
  if (!project) return null;

  const journal = getProjectJournalEntries(projectId);
  const tasks = getProjectTasks(projectId);
  const issues = getProjectIssues(projectId);
  const contacts = getProjectContacts(projectId);

  const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const openIssues = issues.filter(i => i.status !== 'resolved').length;

  return {
    project,
    generatedAt: new Date().toLocaleDateString('pl-PL') + ' ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    stats: {
      totalEntries: journal.length,
      openTasks,
      completedTasks,
      openIssues
    },
    journal,
    tasks,
    issues,
    contacts
  };
};
