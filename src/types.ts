export type ProjectStatus = 'OK' | 'WARNING' | 'PROBLEM';

export interface Project {
  id: string;
  name: string;
  address: string;
  description: string;
  client: string;
  startDate: string;
  status: ProjectStatus;
  notes: string;
  clientContact?: string;
  billingTerms?: string;
  scopeOfWork?: string;
  recurringTasks?: {
    title: string;
    description: string;
    dayOfMonth: number;
  }[];
  endDate?: string;
  equipmentList?: string;
  remunerationAmount?: string;
  keyContractPoints?: string;
  createdAt: string;
  updatedAt: string;
}

export type JournalCategory = 
  | 'note'      // 📝 Notatka
  | 'meeting'   // 🤝 Spotkanie
  | 'contact'   // ☎️ Kontakt
  | 'issue'     // ⚠️ Problem
  | 'work'      // 🔧 Praca
  | 'done'      // ✅ Wykonane
  | 'decision'  // 📅 Ustalenie
  | 'document'  // 📄 Dokument
  | 'photo'     // 📷 Zdjęcie
  | 'info';     // 💡 Informacja

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface GPSLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface JournalEntryFile {
  name: string;
  type: string;
  url: string;
  size?: string;
}

export interface JournalEntry {
  id: string;
  projectId: string;
  projectName?: string; // Cache project name for global timeline view
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  author: string;
  category: JournalCategory;
  title: string;
  content: string;
  priority: Priority;
  status: string; // For general status if needed
  gps: GPSLocation | null;
  photos: string[]; // URLs or base64
  documents: JournalEntryFile[];
  audioUrl: string | null;
  audioTranscription: string | null;
  people: string[];
  relatedTasks: string[]; // Task IDs
  createdAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName?: string;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  status: TaskStatus;
  assignedTo: string;
  createdAt: string;
  sourceEntryId: string | null;
}

export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface IssueHistoryItem {
  id: string;
  date: string;
  action: string;
  user: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName?: string;
  date: string; // YYYY-MM-DD
  priority: Priority;
  status: IssueStatus;
  assignedTo: string;
  photos: string[];
  documents: JournalEntryFile[];
  history: IssueHistoryItem[];
  createdAt: string;
}

export type ContactRole = 
  | 'Klient'
  | 'Kierownik parkingu'
  | 'Wykonawca'
  | 'Serwis'
  | 'Ochrona'
  | 'Administracja'
  | 'Inne';

export interface Contact {
  id: string;
  projectId: string;
  name: string;
  company: string;
  role: ContactRole;
  position: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
  addedDate: string;
  author: string;
  description: string;
  url: string;
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  entryId?: string;
  url: string; // base64 or URL
  date: string;
  time: string;
  author: string;
  gps?: GPSLocation | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  date: string;
  read: boolean;
}
