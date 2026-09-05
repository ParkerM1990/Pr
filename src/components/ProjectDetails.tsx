import React, { useState } from 'react';
import { 
  Project, 
  JournalEntry, 
  Task, 
  Issue, 
  Contact, 
  Priority,
  ContactRole
} from '../types';
import { 
  Info, 
  BookOpen, 
  CheckSquare, 
  AlertTriangle, 
  FileText, 
  Users, 
  History, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Plus, 
  X, 
  Download, 
  Clock,
  Printer,
  Briefcase,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  ClipboardCheck,
  Edit2,
  Trash2,
  Camera,
  Image as ImageIcon,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  ExternalLink,
  Send,
  Check,
  Square
} from 'lucide-react';
import { getProjectTimeline } from '../db/localDb';
import { downloadFile, storeFileInDb, getFileViewUrl, formatBytes, downloadEmlEmail, resolveFileBlob } from '../utils/fileStorage';

interface ProjectDetailsProps {
  project: Project;
  journalEntries: JournalEntry[];
  tasks: Task[];
  issues: Issue[];
  contacts: Contact[];
  onBack: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'projectName'>) => void;
  onAddIssue: (issue: Omit<Issue, 'id' | 'createdAt' | 'projectName' | 'history'>) => void;
  onAddContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
  onAddDocument: (doc: { name: string; type: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx'; addedDate: string; author: string; description: string; url: string }) => void;
  onDeleteDocument: (entryId: string, docIndex: number) => void;
  onDeleteDocuments?: (items: { entryId: string; docIndex: number }[]) => void;
  onDeletePhoto?: (entryId: string, photoIndex: number) => void;
  onDeletePhotos?: (items: { entryId: string; photoIndex: number }[]) => void;
  onAddPhotos?: (urls: string[], caption?: string) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onAddJournalEntry?: () => void;
}

export default function ProjectDetails({
  project,
  journalEntries,
  tasks,
  issues,
  contacts,
  onBack,
  onAddTask,
  onAddIssue,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onAddDocument,
  onDeleteDocument,
  onDeleteDocuments,
  onDeletePhoto,
  onDeletePhotos,
  onAddPhotos,
  onEditProject,
  onDeleteProject,
  onAddJournalEntry
}: ProjectDetailsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'journal' | 'tasks' | 'issues' | 'photos' | 'docs' | 'contacts' | 'history' | 'mgmt'>('info');
  const [showAddModal, setShowAddModal] = useState<'task' | 'issue' | 'contact' | 'doc' | null>(null);
  const [showReport, setShowReport] = useState(false);

  // File drag & drop upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);

  // Manager Milestones state (loaded & saved from localStorage)
  const defaultMilestones = [
    { id: 'm1', label: 'Formalne przekazanie placu budowy / parkingu', checked: true, targetDate: '' },
    { id: 'm2', label: 'Montaż fundamentów i okablowania pętli indukcyjnych', checked: false, targetDate: '' },
    { id: 'm3', label: 'Dostawa i instalacja fizyczna parkomatów CPG', checked: false, targetDate: '' },
    { id: 'm4', label: 'Konfiguracja sieci oraz integracja kamer ANPR', checked: false, targetDate: '' },
    { id: 'm5', label: 'Odbiór końcowy przez Zamawiającego i start poboru opłat', checked: false, targetDate: '' }
  ];

  const [milestones, setMilestones] = useState<Array<{ id: string; label: string; checked: boolean; targetDate?: string }>>(() => {
    const saved = localStorage.getItem(`milestones_by_project_${project.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultMilestones;
      }
    }
    return defaultMilestones;
  });

  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneText, setEditMilestoneText] = useState('');
  const [editMilestoneDate, setEditMilestoneDate] = useState('');
  const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null);

  const suggestedMilestones = [
    'Oznakowanie poziome i pionowe',
    'Odbiór techniczny UDT / dozorowy',
    'Montaż bram i szlabanów automatycznych',
    'Konfiguracja płatności bezgotówkowych i terminali',
    'Szkolenie obsługi i ochrony parkingu',
    'Testy systemu i audyt bezpieczeństwa'
  ];

  const toggleMilestone = (id: string) => {
    const updated = milestones.map((m) => m.id === id ? { ...m, checked: !m.checked } : m);
    setMilestones(updated);
    localStorage.setItem(`milestones_by_project_${project.id}`, JSON.stringify(updated));
  };

  const handleAddMilestone = (labelToAdd?: string, dateToAdd?: string) => {
    const text = (labelToAdd !== undefined ? labelToAdd : newMilestoneText).trim();
    if (!text) return;
    const date = dateToAdd !== undefined ? dateToAdd : newMilestoneDate;
    const newStage = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: text,
      checked: false,
      targetDate: date || undefined
    };
    const updated = [...milestones, newStage];
    setMilestones(updated);
    localStorage.setItem(`milestones_by_project_${project.id}`, JSON.stringify(updated));
    setNewMilestoneText('');
    setNewMilestoneDate('');
    setIsAddingMilestone(false);
  };

  const handleStartEditMilestone = (m: { id: string; label: string; targetDate?: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingMilestoneId(m.id);
    setEditMilestoneText(m.label);
    setEditMilestoneDate(m.targetDate || '');
  };

  const handleSaveEditMilestone = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editMilestoneText.trim()) return;
    const updated = milestones.map((m) => 
      m.id === id 
        ? { ...m, label: editMilestoneText.trim(), targetDate: editMilestoneDate || undefined } 
        : m
    );
    setMilestones(updated);
    localStorage.setItem(`milestones_by_project_${project.id}`, JSON.stringify(updated));
    setEditingMilestoneId(null);
  };

  const handleDeleteMilestone = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const updated = milestones.filter((m) => m.id !== id);
    setMilestones(updated);
    localStorage.setItem(`milestones_by_project_${project.id}`, JSON.stringify(updated));
    setMilestoneToDelete(null);
  };

  // Manager AI Analysis Tool States
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Edit Project States
  const [isEditingProj, setIsEditingProj] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editAddress, setEditAddress] = useState(project.address);
  const [editClient, setEditClient] = useState(project.client);
  const [editStartDate, setEditStartDate] = useState(project.startDate);
  const [editEndDate, setEditEndDate] = useState(project.endDate || '');
  const [editStatus, setEditStatus] = useState(project.status);
  const [editDesc, setEditDesc] = useState(project.description);
  const [editNotes, setEditNotes] = useState(project.notes);
  const [editContact, setEditContact] = useState(project.clientContact || '');
  const [editBilling, setEditBilling] = useState(project.billingTerms || '');
  const [editScope, setEditScope] = useState(project.scopeOfWork || '');
  const [editEquipment, setEditEquipment] = useState(project.equipmentList || '');
  const [editRemuneration, setEditRemuneration] = useState(project.remunerationAmount || '');
  const [editKeyPoints, setEditKeyPoints] = useState(project.keyContractPoints || '');

  const startEditing = () => {
    setEditName(project.name);
    setEditAddress(project.address);
    setEditClient(project.client);
    setEditStartDate(project.startDate);
    setEditEndDate(project.endDate || '');
    setEditStatus(project.status);
    setEditDesc(project.description);
    setEditNotes(project.notes);
    setEditContact(project.clientContact || '');
    setEditBilling(project.billingTerms || '');
    setEditScope(project.scopeOfWork || '');
    setEditEquipment(project.equipmentList || '');
    setEditRemuneration(project.remunerationAmount || '');
    setEditKeyPoints(project.keyContractPoints || '');
    setIsEditingProj(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditProject({
      ...project,
      name: editName,
      address: editAddress,
      client: editClient,
      startDate: editStartDate,
      endDate: editEndDate,
      status: editStatus,
      description: editDesc,
      notes: editNotes,
      clientContact: editContact,
      billingTerms: editBilling,
      scopeOfWork: editScope,
      equipmentList: editEquipment,
      remunerationAmount: editRemuneration,
      keyContractPoints: editKeyPoints
    });
    setIsEditingProj(false);
  };

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState(new Date().toISOString().split('T')[0]);
  const [taskPriority, setTaskPriority] = useState<Priority>('normal');
  const [taskAssigned, setTaskAssigned] = useState('');

  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState<Priority>('high');
  const [issueAssigned, setIssueAssigned] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactRole, setContactRole] = useState<ContactRole>('Klient');
  const [contactPosition, setContactPosition] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Contact Editing States
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactCompany, setEditContactCompany] = useState('');
  const [editContactRole, setEditContactRole] = useState<ContactRole>('Klient');
  const [editContactPosition, setEditContactPosition] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactNotes, setEditContactNotes] = useState('');

  // Contact Deletion Confirmation State
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  // Document Deletion Confirmation State
  const [deletingDoc, setDeletingDoc] = useState<{ id: string; entryId: string; docIndex: number; name: string } | null>(null);

  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx'>('pdf');
  const [docDesc, setDocDesc] = useState('');

  const handleOpenEditContact = (c: Contact) => {
    setEditingContact(c);
    setEditContactName(c.name);
    setEditContactCompany(c.company);
    setEditContactRole(c.role);
    setEditContactPosition(c.position || '');
    setEditContactPhone(c.phone || '');
    setEditContactEmail(c.email || '');
    setEditContactNotes(c.notes || '');
  };

  const handleUpdateContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !editContactName.trim()) return;
    onUpdateContact({
      ...editingContact,
      name: editContactName.trim(),
      company: editContactCompany.trim(),
      role: editContactRole,
      position: editContactPosition.trim(),
      phone: editContactPhone.trim(),
      email: editContactEmail.trim(),
      notes: editContactNotes.trim()
    });
    setEditingContact(null);
  };

  const handleConfirmDeleteContact = (id: string) => {
    onDeleteContact(id);
    setDeletingContactId(null);
  };

  const handleConfirmDeleteDoc = () => {
    if (!deletingDoc) return;
    onDeleteDocument(deletingDoc.entryId, deletingDoc.docIndex);
    setDeletingDoc(null);
  };

  const handleDownloadFile = async (fileName: string, url: string) => {
    try {
      await downloadFile(fileName, url, {
        projectName: project.name,
        client: project.client,
        address: project.address,
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  // Load chronological timeline of project
  const projectTimeline = getProjectTimeline(project.id);

  // Load photos of project (extracted from journal entries and issues)
  const projectPhotos = [
    ...journalEntries.flatMap(e => 
      (e.photos || []).map((url, idx) => ({
        id: `${e.id}_photo_${idx}`,
        entryId: e.id,
        photoIndex: idx,
        projectId: e.projectId,
        url,
        date: e.date,
        time: e.time || '10:00',
        author: e.author || 'Jan Kowalski',
        entryTitle: e.title || 'Wpis w dzienniku',
        category: e.category,
        gps: e.gps,
        sourceType: 'journal' as const
      }))
    ),
    ...issues.filter(i => i.projectId === project.id).flatMap(i => 
      (i.photos || []).map((url, idx) => ({
        id: `issue_${i.id}_photo_${idx}`,
        entryId: i.id,
        photoIndex: idx,
        projectId: i.projectId,
        url,
        date: i.date,
        time: '12:00',
        author: i.assignedTo || 'Serwis',
        entryTitle: `Usterka: ${i.title}`,
        category: 'issue' as const,
        gps: null,
        sourceType: 'issue' as const
      }))
    )
  ];

  // Load documents of project
  const projectDocuments = journalEntries.flatMap(e => 
    (e.documents || []).map((d, idx) => ({
      id: `${e.id}_doc_${idx}`,
      entryId: e.id,
      docIndex: idx,
      projectId: e.projectId,
      name: d.name,
      type: (d.type || (d.name.endsWith('.pdf') ? 'pdf' : d.name.endsWith('.xlsx') || d.name.endsWith('.xls') ? 'xlsx' : d.name.endsWith('.docx') || d.name.endsWith('.doc') ? 'docx' : d.name.endsWith('.png') || d.name.endsWith('.jpg') ? 'jpg' : 'pdf')) as 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx',
      size: d.size || 'Załącznik',
      addedDate: e.date,
      time: e.time || '10:00',
      author: e.author || 'Jan Kowalski',
      entryTitle: e.title || 'Wpis w dzienniku',
      description: d.size ? `${d.size} • We wpisie: "${e.title}"` : `Załączony plik we wpisie: "${e.title}"`,
      url: d.url || '#'
    }))
  );

  // Photos Management States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPhotosToSend, setEmailPhotosToSend] = useState<typeof projectPhotos>([]);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNotes, setEmailNotes] = useState('');
  const [copiedEmailText, setCopiedEmailText] = useState(false);
  const [deletingPhotoItem, setDeletingPhotoItem] = useState<{ entryId: string; photoIndex: number; title: string } | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoList, setNewPhotoList] = useState<string[]>([]);
  const directPhotoInputRef = React.useRef<HTMLInputElement>(null);

  // Documents Management States (Mirroring Photos features)
  const [isDocSelectionMode, setIsDocSelectionMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [showDocEmailModal, setShowDocEmailModal] = useState(false);
  const [emailDocsToSend, setEmailDocsToSend] = useState<typeof projectDocuments>([]);
  const [docEmailRecipient, setDocEmailRecipient] = useState('');
  const [docEmailSubject, setDocEmailSubject] = useState('');
  const [docEmailNotes, setDocEmailNotes] = useState('');
  const [copiedDocEmailText, setCopiedDocEmailText] = useState(false);
  const [deletingDocItem, setDeletingDocItem] = useState<{ id: string; entryId: string; docIndex: number; name: string } | null>(null);
  const [showBatchDeleteDocConfirm, setShowBatchDeleteDocConfirm] = useState(false);
  const [activePreviewDocUrl, setActivePreviewDocUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (previewDocIndex !== null && projectDocuments[previewDocIndex]) {
      const doc = projectDocuments[previewDocIndex];
      let active = true;
      getFileViewUrl(doc.name, doc.url, {
        projectName: project.name,
        client: project.client,
        address: project.address,
        date: doc.addedDate
      }).then(url => {
        if (active) setActivePreviewDocUrl(url);
      });
      return () => {
        active = false;
      };
    } else {
      setActivePreviewDocUrl(null);
    }
  }, [previewDocIndex, projectDocuments, project]);

  const handleOpenFileWindow = async (doc: typeof projectDocuments[0]) => {
    try {
      const viewUrl = await getFileViewUrl(doc.name, doc.url, {
        projectName: project.name,
        client: project.client,
        address: project.address,
        date: doc.addedDate
      });
      window.open(viewUrl, '_blank');
    } catch (err) {
      console.error('Error opening file view window:', err);
    }
  };

  // Keyboard navigation for Lightbox & Document Viewer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewPhotoIndex !== null) {
        if (e.key === 'ArrowRight') {
          setPreviewPhotoIndex(prev => (prev !== null && prev < projectPhotos.length - 1 ? prev + 1 : 0));
          setPreviewZoom(1);
        } else if (e.key === 'ArrowLeft') {
          setPreviewPhotoIndex(prev => (prev !== null && prev > 0 ? prev - 1 : projectPhotos.length - 1));
          setPreviewZoom(1);
        } else if (e.key === 'Escape') {
          setPreviewPhotoIndex(null);
          setPreviewZoom(1);
        }
      } else if (previewDocIndex !== null) {
        if (e.key === 'ArrowRight') {
          setPreviewDocIndex(prev => (prev !== null && prev < projectDocuments.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowLeft') {
          setPreviewDocIndex(prev => (prev !== null && prev > 0 ? prev - 1 : projectDocuments.length - 1));
        } else if (e.key === 'Escape') {
          setPreviewDocIndex(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewPhotoIndex, projectPhotos.length, previewDocIndex, projectDocuments.length]);

  const togglePhotoSelected = (photoId: string) => {
    setSelectedPhotoIds(prev => 
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  const handleSelectAllPhotos = () => {
    if (selectedPhotoIds.length === projectPhotos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(projectPhotos.map(p => p.id));
    }
  };

  const handleDownloadPhoto = (photo: typeof projectPhotos[0], overrideIndex?: number) => {
    const safeTitle = (photo.entryTitle || 'zdjecie').slice(0, 24).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${photo.date}_${overrideIndex ?? '01'}_${safeTitle}.jpg`;

    if (photo.url.startsWith('data:image') || photo.url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = photo.url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const a = document.createElement('a');
      a.href = photo.url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadBatch = (photos: typeof projectPhotos) => {
    photos.forEach((p, idx) => {
      setTimeout(() => {
        handleDownloadPhoto(p, idx + 1);
      }, idx * 250);
    });
  };

  const handleOpenEmailModal = (photosToShare: typeof projectPhotos) => {
    setEmailPhotosToSend(photosToShare);
    setEmailRecipient(contacts.find(c => c.email)?.email || '');
    setEmailSubject(`[City Parking Group] Dokumentacja fotograficzna: ${project.name} (${photosToShare.length} ${photosToShare.length === 1 ? 'zdjęcie' : 'zdjęcia'})`);
    setEmailNotes('');
    setCopiedEmailText(false);
    setShowEmailModal(true);
  };

  const handleNativeShare = async (photo: typeof projectPhotos[0]) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dokumentacja fotograficzna: ${project.name}`,
          text: `Zdjęcie z dnia ${photo.date} (${photo.entryTitle}) - ${project.name}, ${project.address}`,
          url: photo.url.startsWith('http') ? photo.url : window.location.href
        });
      } catch (err) {
        console.log("Share cancelled or failed", err);
      }
    } else {
      handleOpenEmailModal([photo]);
    }
  };

  const handleDownloadItemsBatch = async (items: Array<{ name: string; url: string; addedDate?: string }>) => {
    alert("Rozpoczynanie pobierania plików...");
    for (const item of items) {
      await downloadFile(item.url, item.name);
    }
  };

  const handleNativeShareBatch = async (items: Array<{ name: string; url: string; addedDate?: string }>) => {
    const isInIframe = window.self !== window.top;
    
    if (!isInIframe && navigator.canShare) {
      try {
        const files: File[] = [];
        for (const item of items) {
          const { blob, realName, mimeType } = await resolveFileBlob(item.name, item.url, {
            projectName: project.name,
            client: project.client,
            address: project.address,
            date: item.addedDate
          });
          files.push(new File([blob], realName, { type: mimeType }));
        }

        if (navigator.canShare({ files })) {
          await navigator.share({
            files,
            title: `Dokumentacja: ${project.name}`,
            text: `W załączeniu przesyłam dokumentację dla projektu: ${project.name}`
          });
          return;
        }
      } catch (err) {
        console.error("Batch share failed, falling back to download:", err);
      }
    }

    // Fallback or if in iframe
    await handleDownloadItemsBatch(items);
  };

  const handleSendMailto = () => {
    const photoDetails = emailPhotosToSend.map((p, idx) => {
      const lat = (p.gps as any)?.latitude ?? (p.gps as any)?.lat;
      const lng = (p.gps as any)?.longitude ?? (p.gps as any)?.lng;
      const coordsStr = (typeof lat === 'number' && typeof lng === 'number') ? ` (${lat.toFixed(4)}, ${lng.toFixed(4)})` : '';
      const gpsInfo = p.gps?.address ? ` | Lokalizacja: ${p.gps.address}${coordsStr}` : (coordsStr ? ` | GPS: ${coordsStr}` : '');
      return `${idx + 1}. [${p.date} ${p.time || ''}] "${p.entryTitle || 'Zdjęcie'}" (Autor: ${p.author || 'Serwis'})${gpsInfo}`;
    }).join('\n');

    const emailBody = `Dzień dobry,

W załączeniu przesyłam zestawienie dokumentacji fotograficznej z obiektu:
Projekt: ${project.name}
Inwestor / Klient: ${project.client || 'Brak danych'}
Adres obiektu: ${project.address}
Data zestawienia: ${new Date().toLocaleDateString('pl-PL')}

Liczba załączonych pozycji (${emailPhotosToSend.length}):
${photoDetails}

${emailNotes ? `Uwagi do dokumentacji:\n${emailNotes}\n\n` : ''}Wiadomość wygenerowana z systemu operacyjnego City Parking Group.`;

    const mailto = `mailto:${encodeURIComponent(emailRecipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailto;
  };

  const handleCopyEmailText = () => {
    const photoDetails = emailPhotosToSend.map((p, idx) => {
      const lat = (p.gps as any)?.latitude ?? (p.gps as any)?.lat;
      const lng = (p.gps as any)?.longitude ?? (p.gps as any)?.lng;
      const coordsStr = (typeof lat === 'number' && typeof lng === 'number') ? ` (${lat.toFixed(4)}, ${lng.toFixed(4)})` : '';
      const gpsInfo = p.gps?.address ? ` | Lokalizacja: ${p.gps.address}${coordsStr}` : (coordsStr ? ` | GPS: ${coordsStr}` : '');
      return `${idx + 1}. [${p.date} ${p.time || ''}] "${p.entryTitle || 'Zdjęcie'}" (Autor: ${p.author || 'Serwis'})${gpsInfo}`;
    }).join('\n');

    const emailBody = `Dzień dobry,\n\nDokumentacja fotograficzna:\nProjekt: ${project.name}\nAdres: ${project.address}\n\nZdjęcia (${emailPhotosToSend.length}):\n${photoDetails}\n\n${emailNotes ? `Uwagi:\n${emailNotes}\n\n` : ''}`;

    navigator.clipboard.writeText(emailBody).then(() => {
      setCopiedEmailText(true);
      setTimeout(() => setCopiedEmailText(false), 2500);
    });
  };

  const handleDownloadEmlPhotos = async () => {
    const photoDetails = emailPhotosToSend.map((p, idx) => {
      const lat = (p.gps as any)?.latitude ?? (p.gps as any)?.lat;
      const lng = (p.gps as any)?.longitude ?? (p.gps as any)?.lng;
      const coordsStr = (typeof lat === 'number' && typeof lng === 'number') ? ` (${lat.toFixed(4)}, ${lng.toFixed(4)})` : '';
      const gpsInfo = p.gps?.address ? ` | Lokalizacja: ${p.gps.address}${coordsStr}` : (coordsStr ? ` | GPS: ${coordsStr}` : '');
      return `${idx + 1}. [${p.date} ${p.time || ''}] "${p.entryTitle || 'Zdjęcie'}" (Autor: ${p.author || 'Serwis'})${gpsInfo}`;
    }).join('\n');

    const emailBody = `Dzień dobry,

W załączeniu przesyłam zestawienie dokumentacji fotograficznej z obiektu:
Projekt: ${project.name}
Inwestor / Klient: ${project.client || 'Brak danych'}
Adres obiektu: ${project.address}
Data zestawienia: ${new Date().toLocaleDateString('pl-PL')}

Liczba załączonych pozycji (${emailPhotosToSend.length}):
${photoDetails}

${emailNotes ? `Uwagi do dokumentacji:\n${emailNotes}\n\n` : ''}Wiadomość wygenerowana z systemu operacyjnego City Parking Group.`;

    await downloadEmlEmail(
      emailRecipient,
      emailSubject,
      emailBody,
      emailPhotosToSend.map(p => ({ name: `${p.entryTitle || 'zdjecie'}_${p.date}.jpg`, url: p.url })),
      {
        projectName: project.name,
        client: project.client,
        address: project.address,
        date: new Date().toISOString().split('T')[0]
      }
    );
  };

  const handleConfirmDeleteSinglePhoto = () => {
    if (!deletingPhotoItem) return;
    if (onDeletePhoto) {
      onDeletePhoto(deletingPhotoItem.entryId, deletingPhotoItem.photoIndex);
    }
    setSelectedPhotoIds(prev => prev.filter(id => !id.startsWith(`${deletingPhotoItem.entryId}_photo_${deletingPhotoItem.photoIndex}`)));
    if (previewPhotoIndex !== null) {
      setPreviewPhotoIndex(null);
    }
    setDeletingPhotoItem(null);
  };

  const handleConfirmBatchDelete = () => {
    const itemsToDelete = selectedPhotoIds.map(id => {
      const p = projectPhotos.find(ph => ph.id === id);
      return p ? { entryId: p.entryId, photoIndex: p.photoIndex } : null;
    }).filter(Boolean) as { entryId: string; photoIndex: number }[];

    if (onDeletePhotos) {
      onDeletePhotos(itemsToDelete);
    } else if (onDeletePhoto) {
      itemsToDelete.forEach(item => onDeletePhoto(item.entryId, item.photoIndex));
    }

    setSelectedPhotoIds([]);
    setIsSelectionMode(false);
    setShowBatchDeleteConfirm(false);
  };

  const handleDirectPhotoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewPhotoList(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSaveDirectPhotos = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhotoList.length === 0) return;
    if (onAddPhotos) {
      onAddPhotos(newPhotoList, newPhotoCaption.trim() || undefined);
    }
    setNewPhotoList([]);
    setNewPhotoCaption('');
    setShowAddPhotoModal(false);
  };

  const handleAddSampleDirectPhoto = () => {
    const samplePhotos = [
      "https://images.unsplash.com/photo-1506521788701-1e13a7ea3b77?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800"
    ];
    const picked = samplePhotos[newPhotoList.length % samplePhotos.length];
    setNewPhotoList(prev => [...prev, picked]);
  };

  // Documents Management Handlers (mirroring Photos functionality)
  const toggleDocSelected = (docId: string) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = () => {
    if (selectedDocIds.length === projectDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(projectDocuments.map(d => d.id));
    }
  };

  const handleDownloadDoc = (doc: typeof projectDocuments[0]) => {
    handleDownloadFile(doc.name, doc.url);
  };

  const handleDownloadDocBatch = (docs: typeof projectDocuments) => {
    docs.forEach((doc, idx) => {
      setTimeout(() => {
        handleDownloadFile(doc.name, doc.url);
      }, idx * 250);
    });
  };

  const handleOpenDocEmailModal = (docsToShare: typeof projectDocuments) => {
    setEmailDocsToSend(docsToShare);
    setDocEmailRecipient(contacts[0]?.email || '');
    setDocEmailSubject(`[City Parking Group] Dokumentacja i pliki: ${project.name} (${docsToShare.length} ${docsToShare.length === 1 ? 'plik' : 'plików'})`);
    setDocEmailNotes('');
    setCopiedDocEmailText(false);
    setShowDocEmailModal(true);
  };

  const handleNativeShareDoc = async (doc: typeof projectDocuments[0]) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.name,
          text: `Dokumentacja projektu ${project.name}: ${doc.name} (${doc.size}, autor: ${doc.author})`,
          url: doc.url && doc.url !== '#' ? doc.url : window.location.href
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleOpenDocEmailModal([doc]);
    }
  };

  const handleSendDocMailto = () => {
    const docDetails = emailDocsToSend.map((d, idx) => {
      return `${idx + 1}. Plik: "${d.name}" | Format: ${d.type.toUpperCase()} | Rozmiar: ${d.size} | Dodano: ${d.addedDate} przez ${d.author} (Wpis: "${d.entryTitle}")`;
    }).join('\n');

    const body = 
`Dzień dobry,

W załączeniu przekazuję zestawienie dokumentacji technicznej i plików projektowych:
Inwestycja: ${project.name}
Lokalizacja: ${project.address}
Zamawiający: ${project.client}
Data sporządzenia: ${new Date().toLocaleDateString('pl-PL')}

LISTA ZAŁĄCZONYCH PLIKÓW (${emailDocsToSend.length}):
------------------------------------------------------------
${docDetails}
------------------------------------------------------------

${docEmailNotes ? `Uwagi / komentarz:\n${docEmailNotes}\n\n` : ''}Wiadomość przygotowana z systemu City Parking Group.
Pozdrawiam,
Zespół Realizacji Projektów CPG`;

    const mailtoUrl = `mailto:${encodeURIComponent(docEmailRecipient)}?subject=${encodeURIComponent(docEmailSubject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleCopyDocEmailText = () => {
    const docDetails = emailDocsToSend.map((d, idx) => {
      return `${idx + 1}. Plik: "${d.name}" | Format: ${d.type.toUpperCase()} | Rozmiar: ${d.size} | Dodano: ${d.addedDate} przez ${d.author} (Wpis: "${d.entryTitle}")`;
    }).join('\n');

    const body = 
`Dzień dobry,

W załączeniu przekazuję zestawienie dokumentacji technicznej i plików projektowych:
Inwestycja: ${project.name}
Lokalizacja: ${project.address}
Zamawiający: ${project.client}
Data sporządzenia: ${new Date().toLocaleDateString('pl-PL')}

LISTA ZAŁĄCZONYCH PLIKÓW (${emailDocsToSend.length}):
------------------------------------------------------------
${docDetails}
------------------------------------------------------------

${docEmailNotes ? `Uwagi / komentarz:\n${docEmailNotes}\n\n` : ''}Wiadomość przygotowana z systemu City Parking Group.
Pozdrawiam,
Zespół Realizacji Projektów CPG`;

    navigator.clipboard.writeText(body).then(() => {
      setCopiedDocEmailText(true);
      setTimeout(() => setCopiedDocEmailText(false), 2500);
    });
  };

  const handleDownloadEmlDocs = async () => {
    const docDetails = emailDocsToSend.map((d, idx) => {
      return `${idx + 1}. Plik: "${d.name}" | Format: ${d.type.toUpperCase()} | Rozmiar: ${d.size} | Dodano: ${d.addedDate} przez ${d.author} (Wpis: "${d.entryTitle}")`;
    }).join('\n');

    const body = `Dzień dobry,

W załączeniu przekazuję zestawienie dokumentacji technicznej i plików projektowych:
Inwestycja: ${project.name}
Lokalizacja: ${project.address}
Zamawiający: ${project.client}
Data sporządzenia: ${new Date().toLocaleDateString('pl-PL')}

LISTA ZAŁĄCZONYCH PLIKÓW (${emailDocsToSend.length}):
------------------------------------------------------------
${docDetails}
------------------------------------------------------------

${docEmailNotes ? `Uwagi / komentarz:\n${docEmailNotes}\n\n` : ''}Wiadomość przygotowana z systemu City Parking Group.
Pozdrawiam,
Zespół Realizacji Projektów CPG`;

    await downloadEmlEmail(
      docEmailRecipient,
      docEmailSubject,
      body,
      emailDocsToSend.map(d => ({ name: d.name, url: d.url, addedDate: d.addedDate })),
      {
        projectName: project.name,
        client: project.client,
        address: project.address,
        date: new Date().toISOString().split('T')[0]
      }
    );
  };

  const handleConfirmDeleteSingleDoc = () => {
    if (!deletingDocItem) return;
    onDeleteDocument(deletingDocItem.entryId, deletingDocItem.docIndex);
    setSelectedDocIds(prev => prev.filter(id => id !== deletingDocItem.id));
    if (previewDocIndex !== null) {
      setPreviewDocIndex(null);
    }
    setDeletingDocItem(null);
  };

  const handleConfirmBatchDeleteDocs = () => {
    const itemsToDelete = selectedDocIds.map(id => {
      const d = projectDocuments.find(doc => doc.id === id);
      return d ? { entryId: d.entryId, docIndex: d.docIndex } : null;
    }).filter(Boolean) as { entryId: string; docIndex: number }[];

    if (onDeleteDocuments) {
      onDeleteDocuments(itemsToDelete);
    } else {
      itemsToDelete.forEach(item => onDeleteDocument(item.entryId, item.docIndex));
    }

    setSelectedDocIds([]);
    setIsDocSelectionMode(false);
    setShowBatchDeleteDocConfirm(false);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;
    onAddTask({
      title: taskTitle,
      description: taskDesc,
      projectId: project.id,
      dueDate: taskDue,
      priority: taskPriority,
      status: 'todo',
      assignedTo: taskAssigned || 'Użytkownik',
      sourceEntryId: null
    });
    setTaskTitle('');
    setTaskDesc('');
    setTaskAssigned('');
    setShowAddModal(null);
  };

  const handleAddIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle) return;
    onAddIssue({
      title: issueTitle,
      description: issueDesc,
      projectId: project.id,
      date: new Date().toISOString().split('T')[0],
      priority: issuePriority,
      status: 'open',
      assignedTo: issueAssigned || 'Użytkownik',
      photos: [],
      documents: []
    });
    setIssueTitle('');
    setIssueDesc('');
    setIssueAssigned('');
    setShowAddModal(null);
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName) return;
    onAddContact({
      projectId: project.id,
      name: contactName,
      company: contactCompany,
      role: contactRole,
      position: contactPosition,
      phone: contactPhone,
      email: contactEmail,
      notes: contactNotes
    });
    setContactName('');
    setContactCompany('');
    setContactPosition('');
    setContactPhone('');
    setContactEmail('');
    setContactNotes('');
    setShowAddModal(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    setIsReadingFile(true);
    try {
      const fileUrl = await storeFileInDb(file);
      setUploadedFileDataUrl(fileUrl);
      setUploadedFile({
        name: file.name,
        size: formatBytes(file.size),
        type: file.type
      });
      setDocName(file.name);
      
      // Guess type from extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') setDocType('pdf');
      else if (ext === 'png') setDocType('png');
      else if (ext === 'jpg' || ext === 'jpeg') setDocType('jpg');
      else if (ext === 'docx' || ext === 'doc') setDocType('docx');
      else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') setDocType('xlsx');
    } catch (err) {
      console.error('Error saving uploaded file:', err);
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDocName = uploadedFile ? uploadedFile.name : docName;
    if (!finalDocName) return;
    onAddDocument({
      name: finalDocName,
      type: docType,
      addedDate: new Date().toISOString().split('T')[0],
      author: 'Jan Kowalski (Dyrektor)',
      description: docDesc || `Wgrany plik: ${uploadedFile ? uploadedFile.size : 'brak danych o rozmiarze'}`,
      url: uploadedFileDataUrl || '#'
    });
    setDocName('');
    setDocDesc('');
    setUploadedFile(null);
    setUploadedFileDataUrl(null);
    setShowAddModal(null);
  };

  return (
    <div id="project-details-screen" className="h-full overflow-y-auto pb-24 text-[#E0E0E6] max-w-lg mx-auto">
      {/* Top sticky action header */}
      <div className="bg-[#0F0F12]/95 sticky top-0 z-30 px-3 sm:px-4 py-4 border-b border-[#1F1F24] flex items-center justify-between backdrop-blur-md">
        <button
          id="back-to-projects-btn"
          onClick={onBack}
          className="flex items-center gap-2 text-blue-400 hover:text-white transition font-black text-xs uppercase tracking-wider bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-500/30"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót
        </button>
        <span className="font-extrabold text-white truncate max-w-[150px] text-xs uppercase tracking-wider">{project.name}</span>
        
        <div className="flex gap-2">
          <button
            id="edit-project-btn"
            onClick={startEditing}
            className="bg-[#1C1C21] hover:bg-[#2C2C34] border border-[#2C2C34] text-[#E0E0E6] px-2.5 py-1.5 rounded-xl font-extrabold text-[10px] flex items-center gap-1 transition active:scale-95"
          >
            EDYTUJ
          </button>
          <button
            id="generate-project-report-btn"
            onClick={() => setShowReport(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-xl font-extrabold text-[10px] flex items-center gap-1 shadow-md transition active:scale-95"
          >
            <Printer className="w-3 h-3" />
            RAPORT
          </button>
        </div>
      </div>

      {/* Project Cover Info */}
      <div className="bg-gradient-to-b from-[#0F0F12] to-[#0A0A0C] p-3 sm:p-5 border-b border-[#1C1C21]">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-white leading-tight break-words">{project.name}</h2>
            <p className="text-[#8E8E99] text-[11px] flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#666670] shrink-0" />
              {project.address}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
            project.status === 'OK' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
            project.status === 'WARNING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
            'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
          }`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Tabs list (Horizontal scroll on phone) */}
      <div className="flex bg-[#0F0F12] border-b border-[#1C1C21] px-2 overflow-x-auto scrollbar-none sticky top-12 z-20">
        {[
          { id: 'info', label: 'Info', icon: Info },
          { id: 'journal', label: 'Dziennik', icon: BookOpen },
          { id: 'tasks', label: 'Zadania', icon: CheckSquare },
          { id: 'issues', label: 'Problemy', icon: AlertTriangle },
          { id: 'photos', label: `Zdjęcia (${projectPhotos.length})`, icon: Camera },
          { id: 'docs', label: `Pliki (${projectDocuments.length})`, icon: FileText },
          { id: 'contacts', label: 'Kontakty', icon: Users },
          { id: 'mgmt', label: 'Zarządzanie', icon: Briefcase },
          { id: 'history', label: 'Historia', icon: History }
        ].map(tb => {
          const Icon = tb.icon;
          const isActive = activeTab === tb.id;
          return (
            <button
              id={`project-tab-btn-${tb.id}`}
              key={tb.id}
              onClick={() => setActiveTab(tb.id as any)}
              className={`flex items-center gap-1 py-3 px-3.5 border-b-2 text-xs font-extrabold whitespace-nowrap transition-all duration-200 ${
                isActive 
                  ? 'border-blue-500 text-blue-400 bg-blue-950/10' 
                  : 'border-transparent text-[#8E8E99] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* TABS CONTENT */}
      <div className="p-4">
        
        {/* 1. INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4.5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670] mb-3.5 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
                Dane Ogólne
              </h3>
              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Klient / Inwestor</dt>
                  <dd className="text-white font-bold">{project.client || 'Brak danych'}</dd>
                </div>
                <div>
                  <dt className="text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Data Rozpoczęcia</dt>
                  <dd className="text-white font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#666670]" />
                    {project.startDate}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Zakres Prac</dt>
                  <dd className="text-[#E0E0E6] leading-relaxed bg-[#16161B] p-3 rounded-xl border border-[#1C1C21] text-[11px]">{project.description || 'Brak opisu.'}</dd>
                </div>
              </dl>
            </div>

            {/* ETAPY WDROŻENIA - WIDGET W ZAKŁADCE INFO */}
            <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4.5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670] flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />
                    Etapy Wdrożenia Projektu
                  </h3>
                  <span className="bg-[#16161B] px-2 py-0.5 rounded-full text-[9px] text-blue-300 font-extrabold border border-blue-500/10">
                    {milestones.filter((m) => m.checked).length} / {milestones.length} (
                    {milestones.length > 0
                      ? Math.round((milestones.filter((m) => m.checked).length / milestones.length) * 100)
                      : 0}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('mgmt');
                    setIsAddingMilestone(true);
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-black uppercase tracking-wider flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  Dodaj etap
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#16161B] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${milestones.length > 0 ? (milestones.filter((m) => m.checked).length / milestones.length) * 100 : 0}%` }}
                ></div>
              </div>

              <div className="space-y-1.5">
                {milestones.slice(0, 5).map((m) => (
                  <label 
                    key={m.id} 
                    className="flex items-center gap-2.5 bg-[#16161B]/80 hover:bg-[#1E1E24] p-2.5 rounded-xl border border-[#1C1C21] cursor-pointer transition text-xs"
                  >
                    <input 
                      type="checkbox" 
                      checked={m.checked}
                      onChange={() => toggleMilestone(m.id)}
                      className="rounded border-[#2C2C34] text-blue-600 focus:ring-0 w-3.5 h-3.5 shrink-0" 
                    />
                    <span className={`text-[11px] font-bold truncate flex-1 ${m.checked ? 'text-[#666670] line-through' : 'text-white'}`}>
                      {m.label}
                    </span>
                    {m.targetDate && (
                      <span className="text-[9px] text-[#8E8E99] font-semibold bg-[#0F0F12] px-1.5 py-0.5 rounded border border-[#2C2C34] shrink-0">
                        {m.targetDate}
                      </span>
                    )}
                  </label>
                ))}

                {milestones.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('mgmt')}
                    className="w-full text-center text-[10px] text-blue-400 hover:text-blue-300 py-1 font-extrabold uppercase tracking-wider"
                  >
                    Zobacz wszystkie {milestones.length} etapów w Zarządzaniu →
                  </button>
                )}

                {milestones.length === 0 && (
                  <div className="text-center py-4 text-[#666670] text-xs italic">
                    Brak zdefiniowanych etapów. Kliknij &bdquo;Dodaj etap&rdquo;, aby rozpocząć.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4.5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
                Notatki Wewnętrzne
              </h3>
              <p className="text-xs text-[#E0E0E6] leading-relaxed whitespace-pre-wrap bg-[#16161B] p-3 rounded-xl border border-[#1C1C21] text-[11px]">
                {project.notes || 'Brak notatek technicznych.'}
              </p>
            </div>

            {/* Szczegóły finansowe, sprzętowe i techniczne */}
            {(project.endDate || project.remunerationAmount || project.equipmentList || project.keyContractPoints || project.clientContact || project.billingTerms || project.scopeOfWork) && (
              <div className="bg-[#1C1C21] border border-blue-500/10 rounded-2xl p-4.5 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
                  Szczegóły Umowy i Wyposażenie
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Data Zakończenia Umowy</span>
                    <div className="text-white font-extrabold bg-[#16161B] px-3 py-2 rounded-xl border border-[#1C1C21] text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      {project.endDate || 'Bezterminowo'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Wynagrodzenie City Parking Group</span>
                    <div className="text-emerald-400 font-extrabold bg-[#16161B] px-3 py-2 rounded-xl border border-[#1C1C21] text-[11px] truncate" title={project.remunerationAmount}>
                      💵 {project.remunerationAmount || 'Brak danych'}
                    </div>
                  </div>
                </div>

                {project.equipmentList && (
                  <div>
                    <span className="block text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Spis Urządzeń i Infrastruktury</span>
                    <div className="text-[#E0E0E6] bg-[#16161B] p-3 rounded-xl border border-[#1C1C21] text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                      {project.equipmentList}
                    </div>
                  </div>
                )}

                {project.keyContractPoints && (
                  <div>
                    <span className="block text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Kluczowe Zapisy i Kary Umowne</span>
                    <div className="text-[#E0E0E6] bg-[#16161B] p-3 rounded-xl border border-[#1C1C21] text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                      {project.keyContractPoints}
                    </div>
                  </div>
                )}

                {project.clientContact && (
                  <div>
                    <span className="block text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Dane Kontaktowe Zamawiającego</span>
                    <div className="text-white font-bold bg-[#16161B] p-3 rounded-xl border border-[#1C1C21] text-[11px] leading-relaxed">
                      {project.clientContact}
                    </div>
                  </div>
                )}

                {project.billingTerms && (
                  <div>
                    <span className="block text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Terminy Rozliczeń i Warunki Płatności</span>
                    <div className="text-[#E0E0E6] bg-[#16161B] p-3 rounded-xl border border-[#1C1C21] text-[11px] leading-relaxed whitespace-pre-wrap">
                      {project.billingTerms}
                    </div>
                  </div>
                )}

                {project.scopeOfWork && (
                  <div>
                    <span className="block text-[#666670] font-black uppercase tracking-wide mb-1 text-[9px]">Zakres Obowiązków i Prac Wykonawcy</span>
                    <div className="text-[#E0E0E6] bg-[#16161B] p-3 rounded-xl border border-[#1C1C21] text-[11px] leading-relaxed whitespace-pre-wrap">
                      {project.scopeOfWork}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Danger Zone: deletion button at bottom of Info tab */}
            <div className="bg-[#1C1C21] border border-red-500/10 rounded-2xl p-4.5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2.5 flex items-center gap-1.5">
                Strefa Krytyczna (Usuwanie Projektu)
              </h4>
              <p className="text-[11px] text-[#8E8E99] leading-relaxed mb-3.5">
                Usunięcie projektu spowoduje bezpowrotne skasowanie wszystkich powiązanych zadań, problemów, kontaktów oraz historii wpisów w dzienniku.
              </p>
              {!showDeleteConfirm ? (
                <button
                  id="delete-project-danger-zone-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  USUŃ PROJEKT I WSZYSTKIE POWIĄZANE DANE
                </button>
              ) : (
                <div className="bg-[#16161B] p-3.5 rounded-xl border border-red-500/20 space-y-3">
                  <p className="text-xs text-red-400 font-extrabold flex items-center gap-1.5">
                    ⚠️ CZY NA PEWNO? TEJ OPERACJI NIE MOŻNA COFNĄĆ!
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-[#1C1C21] hover:bg-[#2C2C34] text-[#E0E0E6] py-2 rounded-lg text-xs font-bold transition"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProject(project.id);
                        setShowDeleteConfirm(false);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-xs font-bold transition"
                    >
                      TAK, USUŃ PROJEKT
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick overview metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1C1C21] border border-[#2C2C34] p-3 text-center rounded-2xl">
                <div className="text-lg font-black text-white">{journalEntries.length}</div>
                <div className="text-[9px] text-[#666670] font-black uppercase tracking-wider mt-0.5">Wpisy</div>
              </div>
              <div className="bg-[#1C1C21] border border-[#2C2C34] p-3 text-center rounded-2xl">
                <div className="text-lg font-black text-blue-500">{tasks.filter(t => t.status !== 'done').length}</div>
                <div className="text-[9px] text-[#666670] font-black uppercase tracking-wider mt-0.5">Zadania</div>
              </div>
              <div className="bg-[#1C1C21] border border-[#2C2C34] p-3 text-center rounded-2xl">
                <div className="text-lg font-black text-red-500">{issues.filter(i => i.status !== 'resolved').length}</div>
                <div className="text-[9px] text-[#666670] font-black uppercase tracking-wider mt-0.5">Problemy</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. JOURNAL TAB (Timeline specific to project) */}
        {activeTab === 'journal' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670]">
                Wpisy w Dzienniku ({journalEntries.length})
              </h3>
              {onAddJournalEntry && (
                <button
                  type="button"
                  id="project-add-journal-entry-btn"
                  onClick={onAddJournalEntry}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-black uppercase tracking-wider transition bg-blue-600/10 hover:bg-blue-600/20 px-2.5 py-1 rounded-lg border border-blue-500/20"
                >
                  <Plus className="w-3 h-3" /> DODAJ WPIS
                </button>
              )}
            </div>

            {journalEntries.map(e => (
              <div key={e.id} className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#16161B] border border-[#1C1C21] text-blue-400">
                      {e.category}
                    </span>
                    <h4 className="font-extrabold text-white text-sm mt-1">{e.title}</h4>
                  </div>
                  <span className="text-[10px] text-[#666670] font-semibold">{e.date} {e.time}</span>
                </div>
                <p className="text-xs text-[#8E8E99] leading-relaxed mb-3 font-medium">{e.content}</p>
                
                {e.photos && e.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                    {e.photos.map((ph, idx) => (
                      <img key={idx} src={ph} alt="foto" className="w-24 h-16 rounded-lg object-cover border border-[#2C2C34]" referrerPolicy="no-referrer" />
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-[#666670] font-bold">Autor: {e.author}</div>
              </div>
            ))}
            {journalEntries.length === 0 && (
              <div className="text-center py-8 text-[#666670] text-xs italic">Brak wpisów dla tego projektu.</div>
            )}
          </div>
        )}

        {/* 3. TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670]">Zadania</h3>
              <button
                onClick={() => setShowAddModal('task')}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-black uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" /> DODAJ ZADANIE
              </button>
            </div>

            {tasks.map(t => (
              <div key={t.id} className="bg-[#1C1C21] border border-[#2C2C34] p-3.5 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-[#E0E0E6] text-xs">{t.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[#666670] font-bold">
                    <span>Termin: {t.dueDate}</span>
                    <span>•</span>
                    <span>Osoba: {t.assignedTo}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                  t.status === 'done' ? 'bg-green-950/20 text-green-400 border-green-900/30' : 'bg-[#16161B] text-[#8E8E99] border-[#1C1C21]'
                }`}>
                  {t.status === 'todo' ? 'DO ZROBIENIA' : t.status === 'in_progress' ? 'W TRAKCIE' : t.status === 'done' ? 'GOTOWE' : 'ANULOWANE'}
                </span>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="text-center py-8 text-[#666670] text-xs italic">Brak zadań. Kliknij dodaj, aby utworzyć.</div>
            )}
          </div>
        )}

        {/* 4. ISSUES (PROBLEMS) TAB */}
        {activeTab === 'issues' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670]">Problemy i Awaryjność</h3>
              <button
                onClick={() => setShowAddModal('issue')}
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-black uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" /> ZGŁOŚ PROBLEM
              </button>
            </div>

            {issues.map(i => (
              <div key={i.id} className="bg-[#1C1C21] border border-[#2C2C34] p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1">
                    <span className="text-red-500">⚠️</span>
                    {i.title}
                  </h4>
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-red-950/20 text-red-400 border border-red-900/30">
                    {i.status}
                  </span>
                </div>
                <p className="text-xs text-[#8E8E99] leading-relaxed font-medium">{i.description}</p>
                <div className="text-[10px] text-[#666670] flex justify-between font-bold">
                  <span>Odpowiedzialny: {i.assignedTo}</span>
                  <span>Priorytet: {i.priority.toUpperCase()}</span>
                </div>
              </div>
            ))}

            {issues.length === 0 && (
              <div className="text-center py-8 text-[#666670] text-xs italic">Wszystko sprawne! Brak zarejestrowanych problemów.</div>
            )}
          </div>
        )}

        {/* 5. PHOTOS TAB (DEDICATED PHOTO GALLERY & MANAGEMENT) */}
        {activeTab === 'photos' && (
          <div className="space-y-4 pb-20">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#16161B] border border-[#2C2C34] p-4 rounded-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Dokumentacja Fotograficzna</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-950/40 text-blue-400 border border-blue-900/30 text-[10px] font-black">
                    {projectPhotos.length} {projectPhotos.length === 1 ? 'zdjęcie' : 'zdjęć'}
                  </span>
                </div>
                <p className="text-[11px] text-[#8E8E99] mt-0.5">
                  Podgląd, pobieranie plików, udostępnianie e-mailem oraz usuwanie dokumentacji obiektu
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddPhotoModal(true)}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-lg shadow-blue-900/20 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Dodaj zdjęcia
                </button>

                {projectPhotos.length > 0 && (
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedPhotoIds([]);
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                      isSelectionMode
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-400'
                        : 'bg-[#1C1C21] hover:bg-[#25252D] border-[#2C2C34] text-[#8E8E99] hover:text-white'
                    }`}
                  >
                    {isSelectionMode ? (
                      <>
                        <X className="w-3.5 h-3.5" /> Zakończ wybór
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" /> Zaznacz zdjęcia
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Selection Toolbar Bar */}
            {isSelectionMode && projectPhotos.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAllPhotos}
                    className="px-2.5 py-1 rounded-lg bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 font-bold text-[11px] transition"
                  >
                    {selectedPhotoIds.length === projectPhotos.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                  </button>
                  <span className="text-amber-200/90 font-medium text-xs">
                    Zaznaczono: <strong className="text-amber-300 font-black">{selectedPhotoIds.length}</strong> z {projectPhotos.length}
                  </span>
                </div>

                {selectedPhotoIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const selected = projectPhotos.filter(p => selectedPhotoIds.includes(p.id));
                        handleOpenEmailModal(selected);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow transition"
                    >
                      <Mail className="w-3 h-3" /> Wyślij e-mail ({selectedPhotoIds.length})
                    </button>
                    <button
                      onClick={() => {
                        const selected = projectPhotos.filter(p => selectedPhotoIds.includes(p.id));
                        handleDownloadBatch(selected);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#25252D] hover:bg-[#32323D] text-white font-bold text-[11px] flex items-center gap-1 border border-[#3C3C48] transition"
                    >
                      <Download className="w-3 h-3" /> Pobierz ({selectedPhotoIds.length})
                    </button>
                    <button
                      onClick={() => setShowBatchDeleteConfirm(true)}
                      className="px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" /> Usuń ({selectedPhotoIds.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {projectPhotos.length === 0 && (
              <div className="bg-[#16161B] border border-dashed border-[#2C2C34] rounded-2xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-950/30 border border-blue-900/30 flex items-center justify-center mx-auto text-blue-400">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white">Brak zdjęć w dokumentacji</h4>
                <p className="text-xs text-[#8E8E99] max-w-sm mx-auto leading-relaxed">
                  Możesz dodać zdjęcia bezpośrednio tutaj lub poprzez Szybki wpis do dziennika z aparatu / załączników.
                </p>
                <button
                  onClick={() => setShowAddPhotoModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black tracking-wide inline-flex items-center gap-1.5 shadow transition active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Dodaj pierwsze zdjęcia
                </button>
              </div>
            )}

            {/* Photos Grid */}
            {projectPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {projectPhotos.map((ph, idx) => {
                  const isSelected = selectedPhotoIds.includes(ph.id);
                  return (
                    <div
                      key={ph.id}
                      onClick={() => {
                        if (isSelectionMode) {
                          togglePhotoSelected(ph.id);
                        } else {
                          setPreviewPhotoIndex(idx);
                          setPreviewZoom(1);
                        }
                      }}
                      className={`group relative rounded-2xl overflow-hidden border bg-[#16161B] transition-all cursor-pointer select-none flex flex-col ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-950/20'
                          : 'border-[#2C2C34] hover:border-[#3E3E4C] hover:shadow-md'
                      }`}
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0F0F12]">
                        <img
                          src={ph.url}
                          alt={ph.entryTitle || 'Zdjęcie projektu'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />

                        {/* Dark Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Top Left: Select Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePhotoSelected(ph.id);
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-black shadow-md'
                                : 'bg-black/60 hover:bg-black/80 text-white/70 border border-white/20 backdrop-blur-sm'
                            } ${isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Square className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Top Right: Badges */}
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                          {ph.gps && (
                            <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-emerald-400 border border-emerald-900/40 text-[9px] font-bold flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" /> GPS
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[#8E8E99] border border-white/10 text-[9px] font-semibold">
                            {ph.sourceType === 'issue' ? 'Usterka' : 'Dziennik'}
                          </span>
                        </div>

                        {/* Quick Action Overlay Buttons (Desktop Hover) */}
                        <div className="absolute inset-x-2 bottom-2 z-10 hidden sm:flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Podgląd"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhotoIndex(idx);
                              setPreviewZoom(1);
                            }}
                            className="p-1.5 rounded-lg bg-black/75 hover:bg-blue-600 text-white border border-white/10 backdrop-blur-sm transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Pobierz zdjęcie"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPhoto(ph, idx + 1);
                            }}
                            className="p-1.5 rounded-lg bg-black/75 hover:bg-blue-600 text-white border border-white/10 backdrop-blur-sm transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Udostępnij przez e-mail"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEmailModal([ph]);
                            }}
                            className="p-1.5 rounded-lg bg-black/75 hover:bg-blue-600 text-white border border-white/10 backdrop-blur-sm transition"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Usuń zdjęcie"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPhotoItem({
                                entryId: ph.entryId,
                                photoIndex: ph.photoIndex,
                                title: ph.entryTitle
                              });
                            }}
                            className="p-1.5 rounded-lg bg-black/75 hover:bg-red-600 text-white border border-white/10 backdrop-blur-sm transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Info Footer */}
                      <div className="p-2.5 space-y-1 bg-[#16161B] flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-[#8E8E99] font-semibold">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-[#666670]" />
                              {ph.date}
                            </span>
                            <span>{ph.time}</span>
                          </div>
                          <p className="text-xs font-bold text-white truncate mt-0.5" title={ph.entryTitle}>
                            {ph.entryTitle}
                          </p>
                        </div>

                        {/* Mobile quick actions bar */}
                        <div className="sm:hidden pt-1.5 border-t border-[#25252D] flex items-center justify-between">
                          <span className="text-[9px] text-[#666670] truncate max-w-[80px]">{ph.author}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPhoto(ph, idx + 1);
                              }}
                              className="p-1 rounded bg-[#25252D] text-[#8E8E99] hover:text-white"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEmailModal([ph]);
                              }}
                              className="p-1 rounded bg-[#25252D] text-[#8E8E99] hover:text-white"
                            >
                              <Mail className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingPhotoItem({
                                  entryId: ph.entryId,
                                  photoIndex: ph.photoIndex,
                                  title: ph.entryTitle
                                });
                              }}
                              className="p-1 rounded bg-red-950/40 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky Floating Bottom Bar for Multiple Selected Photos */}
            {selectedPhotoIds.length > 0 && (
              <div className="fixed bottom-6 inset-x-4 max-w-xl mx-auto z-40 bg-[#1C1C21]/95 border border-amber-500/40 shadow-2xl backdrop-blur-md rounded-2xl p-3 flex items-center justify-between gap-2 text-white">
                <div className="flex items-center gap-2 pl-1">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
                    {selectedPhotoIds.length}
                  </span>
                  <span className="text-xs font-bold text-amber-200 hidden xs:inline">
                    Zaznaczono
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const selected = projectPhotos.filter(p => selectedPhotoIds.includes(p.id));
                      handleOpenEmailModal(selected);
                    }}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95"
                  >
                    <Mail className="w-3.5 h-3.5" /> Udostępnij e-mail
                  </button>
                  <button
                    onClick={() => {
                      const selected = projectPhotos.filter(p => selectedPhotoIds.includes(p.id));
                      handleDownloadBatch(selected);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#2C2C34] hover:bg-[#383842] text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" /> Pobierz
                  </button>
                  <button
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    className="px-2.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedPhotoIds([])}
                    className="p-2 rounded-xl bg-[#25252D] hover:bg-[#32323D] text-[#8E8E99] hover:text-white transition"
                    title="Anuluj wybór"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. DOCUMENTS (FILES) TAB */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            {/* Header & Mode Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-[#1C1C21]">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670]">Pliki i Dokumentacja</h3>
                <span className="px-2 py-0.5 rounded-md bg-[#16161B] text-[#8E8E99] border border-[#1C1C21] text-[10px] font-bold">
                  {projectDocuments.length}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {projectDocuments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocSelectionMode(!isDocSelectionMode);
                      if (isDocSelectionMode) setSelectedDocIds([]);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition ${
                      isDocSelectionMode
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                        : 'bg-[#16161B] hover:bg-[#25252D] border-[#2C2C34] text-[#8E8E99] hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isDocSelectionMode ? 'Zakończ zaznaczanie' : 'Wybierz wiele'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAddModal('doc')}
                  className="text-xs px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wide flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj dokument</span>
                </button>
              </div>
            </div>

            {/* Batch Selection Action Bar */}
            {isDocSelectionMode && projectDocuments.length > 0 && (
              <div className="sticky top-24 z-10 bg-[#16161B] border border-blue-500/30 rounded-2xl p-3 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 animate-fade-in">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAllDocs}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-[#25252D] hover:bg-[#32323D] text-white font-bold flex items-center gap-1.5 border border-[#3C3C48] transition"
                  >
                    {selectedDocIds.length === projectDocuments.length ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                        <span>Odznacz wszystkie</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>Zaznacz wszystkie ({projectDocuments.length})</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-[#8E8E99] font-medium">
                    Zaznaczono: <strong className="text-white">{selectedDocIds.length}</strong> z {projectDocuments.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Email selected */}
                  <button
                    type="button"
                    disabled={selectedDocIds.length === 0}
                    onClick={() => {
                      const docs = projectDocuments.filter(d => selectedDocIds.includes(d.id));
                      handleOpenDocEmailModal(docs);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold flex items-center gap-1.5 shadow transition"
                    title="Wyślij wybrane pliki e-mailem"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-mail ({selectedDocIds.length})</span>
                  </button>

                  {/* Download selected */}
                  <button
                    type="button"
                    disabled={selectedDocIds.length === 0}
                    onClick={() => {
                      const docs = projectDocuments.filter(d => selectedDocIds.includes(d.id));
                      handleDownloadDocBatch(docs);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-[#25252D] hover:bg-[#32323D] disabled:opacity-40 disabled:pointer-events-none text-white font-bold flex items-center gap-1.5 border border-[#3C3C48] transition"
                    title="Pobierz wybrane pliki"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pobierz ({selectedDocIds.length})</span>
                  </button>

                  {/* Batch Delete */}
                  <button
                    type="button"
                    disabled={selectedDocIds.length === 0}
                    onClick={() => setShowBatchDeleteDocConfirm(true)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none text-red-400 hover:text-white font-bold flex items-center gap-1.5 border border-red-900/40 transition"
                    title="Usuń zaznaczone pliki"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Usuń ({selectedDocIds.length})</span>
                  </button>

                  {/* Cancel Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocSelectionMode(false);
                      setSelectedDocIds([]);
                    }}
                    className="p-1.5 rounded-xl text-[#8E8E99] hover:text-white hover:bg-[#25252D] transition"
                    title="Anuluj tryb wyboru"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Documents List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projectDocuments.map((doc, idx) => {
                const isSelected = selectedDocIds.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (isDocSelectionMode) {
                        toggleDocSelected(doc.id);
                      }
                    }}
                    className={`group bg-[#1C1C21] border rounded-2xl p-3.5 transition flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/15 ring-2 ring-blue-500/30'
                        : 'border-[#2C2C34] hover:border-[#3C3C48]'
                    } ${isDocSelectionMode ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Checkbox button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDocSelected(doc.id);
                        }}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : isDocSelectionMode
                            ? 'bg-[#16161B] border-[#3C3C48] text-transparent hover:border-blue-500'
                            : 'bg-[#16161B] border-[#2C2C34] text-transparent group-hover:border-[#4C4C58]'
                        }`}
                        title={isSelected ? 'Odznacz' : 'Zaznacz'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      {/* Document Type Badge/Icon */}
                      <div
                        onClick={(e) => {
                          if (!isDocSelectionMode) {
                            e.stopPropagation();
                            setPreviewDocIndex(idx);
                          }
                        }}
                        className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors"
                        title="Otwórz podgląd dokumentu"
                      >
                        <FileText className="w-5 h-5" />
                      </div>

                      {/* File Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            onClick={(e) => {
                              if (!isDocSelectionMode) {
                                e.stopPropagation();
                                setPreviewDocIndex(idx);
                              }
                            }}
                            className="font-bold text-white text-xs truncate hover:text-blue-400 cursor-pointer"
                            title={doc.name}
                          >
                            {doc.name}
                          </h4>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 border ${
                            doc.type === 'pdf' ? 'bg-red-950/40 border-red-900/30 text-red-400' :
                            doc.type === 'xlsx' ? 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400' :
                            doc.type === 'docx' ? 'bg-blue-950/40 border-blue-900/30 text-blue-400' :
                            'bg-[#25252D] border-[#3C3C48] text-[#8E8E99]'
                          }`}>
                            {doc.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#8E8E99] font-medium mt-1 truncate">
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>{doc.addedDate}</span>
                          <span>•</span>
                          <span className="truncate">{doc.author}</span>
                        </div>

                        <p className="text-[10px] text-[#666670] truncate mt-0.5">
                          {doc.entryTitle}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2 border-t border-[#2C2C34] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewDocIndex(idx);
                        }}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Podgląd</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {/* Download */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDoc(doc);
                          }}
                          title="Pobierz plik"
                          className="p-1.5 rounded-lg bg-[#16161B] hover:bg-[#25252D] border border-[#2C2C34] text-[#8E8E99] hover:text-blue-400 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Email */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocEmailModal([doc]);
                          }}
                          title="Wyślij e-mailem"
                          className="p-1.5 rounded-lg bg-[#16161B] hover:bg-[#25252D] border border-[#2C2C34] text-[#8E8E99] hover:text-blue-400 transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>

                        {/* Native Share */}
                        {'share' in navigator && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNativeShareDoc(doc);
                            }}
                            title="Udostępnij"
                            className="p-1.5 rounded-lg bg-[#16161B] hover:bg-[#25252D] border border-[#2C2C34] text-[#8E8E99] hover:text-white transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Single Delete */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingDocItem({
                              id: doc.id,
                              entryId: doc.entryId,
                              docIndex: doc.docIndex,
                              name: doc.name
                            });
                          }}
                          title="Usuń plik"
                          className="p-1.5 rounded-lg bg-[#16161B] hover:bg-red-950/40 border border-[#2C2C34] hover:border-red-900/40 text-[#8E8E99] hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {projectDocuments.length === 0 && (
              <div className="border border-dashed border-[#2C2C34] rounded-2xl p-8 text-center space-y-3 bg-[#16161B]/50">
                <div className="w-12 h-12 rounded-2xl bg-blue-950/20 border border-blue-900/30 flex items-center justify-center mx-auto text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Brak zapisanych plików w tym projekcie</h4>
                  <p className="text-xs text-[#8E8E99] mt-1 max-w-sm mx-auto">
                    Dodaj pliki techniczne, protokoły odbioru, schematy lub kosztorysy do wpisów dziennika lub bezpośrednio do projektu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal('doc')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj pierwszy dokument</span>
                </button>
              </div>
            )}

            {projectPhotos.length > 0 && (
              <div className="pt-4 border-t border-[#1C1C21] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670]">Galeria Zdjęć Projektu</h3>
                    <span className="px-1.5 py-0.2 rounded bg-[#16161B] text-[#8E8E99] border border-[#1C1C21] text-[9px] font-bold">
                      {projectPhotos.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('photos')}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition"
                  >
                    Otwórz pełną galerię ({projectPhotos.length}) <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {projectPhotos.map((ph, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setPreviewPhotoIndex(idx);
                        setPreviewZoom(1);
                      }}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-[#2C2C34] hover:border-blue-500/50 bg-[#16161B] cursor-pointer transition shadow-sm"
                    >
                      <img src={ph.url} alt="Galeria" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                        <span className="p-1.5 rounded-lg bg-black/70 text-white"><Eye className="w-3.5 h-3.5" /></span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-[#0A0A0C]/90 p-1 text-[8px] text-[#8E8E99] text-center truncate font-medium">
                        {ph.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670]">Osoby Kontaktowe</h3>
                <span className="px-2 py-0.5 rounded-md bg-[#16161B] text-[#8E8E99] border border-[#1C1C21] text-[10px] font-bold">
                  {contacts.length}
                </span>
              </div>
              <button
                onClick={() => setShowAddModal('contact')}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-black uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" /> DODAJ KONTAKT
              </button>
            </div>

            {contacts.map(c => {
              const isDeleting = deletingContactId === c.id;
              return (
                <div key={c.id} className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{c.name}</h4>
                      <p className="text-[11px] text-[#8E8E99] mt-0.5 font-semibold">{c.company} — <span className="text-blue-400 font-extrabold uppercase text-[10px] tracking-wider">{c.role}</span></p>
                      {c.position && <p className="text-[10px] text-[#666670] italic mt-0.5 font-bold">{c.position}</p>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditContact(c)}
                        title="Edytuj kontakt"
                        className="w-8 h-8 rounded-lg bg-[#16161B] hover:bg-[#25252D] border border-[#1C1C21] hover:border-[#2C2C34] flex items-center justify-center text-[#8E8E99] hover:text-blue-400 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingContactId(isDeleting ? null : c.id)}
                        title="Usuń kontakt"
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${
                          isDeleting
                            ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/50'
                            : 'bg-[#16161B] hover:bg-red-950/30 border-[#1C1C21] hover:border-red-900/40 text-[#8E8E99] hover:text-red-400'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isDeleting && (
                    <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <p className="text-xs text-red-300 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        Czy na pewno chcesz usunąć kontakt {c.name}?
                      </p>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setDeletingContactId(null)}
                          className="px-2.5 py-1 rounded-lg bg-[#1C1C21] hover:bg-[#25252D] text-[#8E8E99] hover:text-white text-[11px] font-bold transition border border-[#2C2C34]"
                        >
                          Anuluj
                        </button>
                        <button
                          onClick={() => handleConfirmDeleteContact(c.id)}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-black tracking-wide shadow transition active:scale-95"
                        >
                          Usuń kontakt
                        </button>
                      </div>
                    </div>
                  )}

                  {c.notes && (
                    <p className="text-xs text-[#8E8E99] bg-[#16161B] p-2.5 rounded-xl border border-[#1C1C21] leading-relaxed italic font-medium">
                      &ldquo;{c.notes}&rdquo;
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1C1C21] text-[10px] font-extrabold uppercase tracking-wider">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="bg-[#16161B] border border-[#1C1C21] hover:border-[#2C2C34] py-2 rounded-xl flex items-center justify-center gap-1.5 text-white transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-green-500" />
                        Zadzwoń
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="bg-[#16161B] border border-[#1C1C21] hover:border-[#2C2C34] py-2 rounded-xl flex items-center justify-center gap-1.5 text-white transition"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        E-mail
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {contacts.length === 0 && (
              <div className="text-center py-8 text-[#666670] text-xs italic">Brak kontaktów przypisanych do tego projektu.</div>
            )}
          </div>
        )}

        {/* 7. PROJECT CHRONOLOGICAL HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#666670] mb-1">Historia Osi Czasu</h3>
            
            <div className="relative border-l border-[#1C1C21] pl-4 ml-2.5 space-y-5 py-2">
              {projectTimeline.map((ev) => (
                <div key={ev.id} className="relative">
                  <span className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                    ev.type === 'start' ? 'bg-green-500 border-[#0A0A0C]' :
                    ev.category === 'issue' ? 'bg-red-500 border-[#0A0A0C] animate-pulse' :
                    'bg-blue-500 border-[#0A0A0C]'
                  }`}></span>

                  <span className="text-[9px] text-[#666670] font-black block uppercase tracking-wider">{ev.date} {ev.time || ''}</span>
                  <h4 className="font-extrabold text-white text-xs mt-0.5">{ev.title}</h4>
                  <p className="text-xs text-[#8E8E99] leading-relaxed mt-1 bg-[#1C1C21] p-2.5 rounded-xl border border-[#2C2C34] font-medium">{ev.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. MANAGER MANAGEMENT & RISK TAB */}
        {activeTab === 'mgmt' && (
          <div className="space-y-4 text-left">
            {/* KPI Metrics */}
            <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4.5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                KPI i Finanse Kontraktu
              </h3>
              
              <div className="grid grid-cols-2 gap-3.5 mb-4">
                <div className="bg-[#16161B] p-3 rounded-xl border border-[#1C1C21]">
                  <span className="text-[9px] uppercase font-black text-[#666670] block mb-1">Miesięczny Przychód</span>
                  <span className="text-sm font-black text-white">
                    {project.remunerationAmount || 'Ryczałt nieustalony'}
                  </span>
                </div>
                <div className="bg-[#16161B] p-3 rounded-xl border border-[#1C1C21]">
                  <span className="text-[9px] uppercase font-black text-[#666670] block mb-1">Rentowność (Szacowana)</span>
                  <span className="text-sm font-black text-emerald-400">82.4%</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-[10px] text-[#8E8E99] font-bold mb-1">
                    <span>Budżet operacyjny na serwis i części</span>
                    <span className="text-white">15.0% przychodu</span>
                  </div>
                  <div className="w-full bg-[#16161B] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones Checklist & Management */}
            <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-2xl p-4.5 space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4" />
                    Kluczowe Etapy Uruchomienia i Wdrożenia
                  </h3>
                  <span className="bg-[#16161B] px-2 py-0.5 rounded-full text-[9px] text-blue-300 font-extrabold border border-blue-500/10">
                    {milestones.filter((m) => m.checked).length} / {milestones.length} (
                    {milestones.length > 0
                      ? Math.round((milestones.filter((m) => m.checked).length / milestones.length) * 100)
                      : 0}%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  {isAddingMilestone ? 'Zamknij' : 'Dodaj Etap'}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#16161B] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${milestones.length > 0 ? (milestones.filter((m) => m.checked).length / milestones.length) * 100 : 0}%` }}
                ></div>
              </div>

              {/* Expandable Add Stage Panel */}
              {isAddingMilestone && (
                <div className="bg-[#16161B] border border-blue-500/30 rounded-xl p-3.5 space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-white tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      Nowy Etap Wdrożenia
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingMilestone(false)}
                      className="text-[#8E8E99] hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newMilestoneText}
                      onChange={(e) => setNewMilestoneText(e.target.value)}
                      placeholder="Nazwa etapu (np. Odbiory UDT, Montaż oznakowania)..."
                      className="sm:col-span-2 bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMilestone();
                        }
                      }}
                    />
                    <input
                      type="date"
                      value={newMilestoneDate}
                      onChange={(e) => setNewMilestoneDate(e.target.value)}
                      placeholder="Termin"
                      className="bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#1F1F26]">
                    <div className="text-[10px] text-[#8E8E99]">
                      <span className="font-bold text-[#666670] uppercase mr-1.5">Szybkie propozycje:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {suggestedMilestones.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleAddMilestone(sug)}
                            className="bg-[#1C1C21] hover:bg-blue-950/40 text-[#8E8E99] hover:text-blue-300 border border-[#2C2C34] hover:border-blue-500/30 px-2 py-0.5 rounded-lg text-[9px] font-semibold transition"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                      <button
                        type="button"
                        onClick={() => setIsAddingMilestone(false)}
                        className="px-3 py-1.5 rounded-xl bg-[#1C1C21] hover:bg-[#25252D] text-[#8E8E99] text-xs font-bold transition"
                      >
                        Anuluj
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddMilestone()}
                        disabled={!newMilestoneText.trim()}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition shadow-md"
                      >
                        Dodaj Etap
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones List */}
              <div className="space-y-2">
                {milestones.map((m) => {
                  const isEditing = editingMilestoneId === m.id;
                  const isDeleting = milestoneToDelete === m.id;

                  if (isEditing) {
                    return (
                      <form
                        key={m.id}
                        onSubmit={(e) => handleSaveEditMilestone(m.id, e)}
                        className="bg-[#16161B] border border-blue-500/50 p-3 rounded-xl space-y-2"
                      >
                        <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Edycja etapu wdrożenia</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={editMilestoneText}
                            onChange={(e) => setEditMilestoneText(e.target.value)}
                            className="sm:col-span-2 bg-[#1C1C21] border border-[#2C2C34] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500/60"
                            placeholder="Nazwa etapu..."
                            autoFocus
                          />
                          <input
                            type="date"
                            value={editMilestoneDate}
                            onChange={(e) => setEditMilestoneDate(e.target.value)}
                            className="bg-[#1C1C21] border border-[#2C2C34] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500/60"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingMilestoneId(null)}
                            className="px-2.5 py-1 rounded-lg bg-[#1C1C21] text-[#8E8E99] text-[11px] font-bold"
                          >
                            Anuluj
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider"
                          >
                            Zapisz
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`group flex items-center justify-between gap-2.5 bg-[#16161B] hover:bg-[#1E1E24] p-3 rounded-xl border transition ${
                        m.checked ? 'border-[#1C1C21] opacity-75' : 'border-[#22222A]'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                        <input 
                          type="checkbox" 
                          checked={m.checked}
                          onChange={() => toggleMilestone(m.id)}
                          className="rounded border-[#2C2C34] text-blue-600 focus:ring-0 w-4 h-4 shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <span className={`text-[11px] leading-relaxed font-bold block break-words ${m.checked ? 'text-[#666670] line-through' : 'text-white'}`}>
                            {m.label}
                          </span>
                          {m.targetDate && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-blue-400 font-semibold mt-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              Planowany termin: {m.targetDate}
                            </span>
                          )}
                        </div>
                      </label>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {isDeleting ? (
                          <div className="flex items-center gap-1 bg-red-950/40 p-1 rounded-lg border border-red-900/40">
                            <span className="text-[10px] text-red-300 font-bold px-1">Usunąć?</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteMilestone(m.id, e)}
                              className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-black"
                            >
                              Tak
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMilestoneToDelete(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#1C1C21] text-[#8E8E99] text-[10px]"
                            >
                              Nie
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleStartEditMilestone(m, e)}
                              title="Edytuj etap"
                              className="w-7 h-7 rounded-lg bg-[#1C1C21] hover:bg-[#282832] flex items-center justify-center text-[#8E8E99] hover:text-blue-400 transition border border-[#22222A]"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMilestoneToDelete(m.id);
                              }}
                              title="Usuń etap"
                              className="w-7 h-7 rounded-lg bg-[#1C1C21] hover:bg-red-950/30 flex items-center justify-center text-[#8E8E99] hover:text-red-400 transition border border-[#22222A]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {milestones.length === 0 && (
                  <div className="text-center py-6 text-[#666670] text-xs italic bg-[#16161B] rounded-xl border border-[#1C1C21]">
                    Brak zdefiniowanych etapów wdrożenia. Kliknij &bdquo;Dodaj Etap&rdquo; lub wpisz poniżej, aby utworzyć harmonogram.
                  </div>
                )}
              </div>

              {/* Quick Inline Add Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddMilestone();
                }}
                className="flex items-center gap-2 pt-1"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    placeholder="Dodaj kolejny etap wdrożenia i wciśnij Enter..."
                    className="w-full bg-[#16161B] border border-[#2C2C34] hover:border-[#383842] focus:border-blue-500/60 rounded-xl px-3.5 py-2 text-xs text-white outline-none pr-10"
                  />
                  {newMilestoneText && (
                    <button
                      type="button"
                      onClick={() => setNewMilestoneText('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E99] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newMilestoneText.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Dodaj
                </button>
              </form>
            </div>

            {/* AI Diagnostics tool for PM */}
            <div className="bg-[#1C1C21] border border-blue-500/10 rounded-2xl p-4.5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Asystent Diagnostyki Operacyjnej AI
              </h3>
              <p className="text-[11px] text-[#8E8E99] leading-relaxed mb-3.5">
                Automatyczny system przeanalizuje stan spraw, otwarte awarie i terminy, dostarczając rekomendacje działań.
              </p>

              {aiLoading ? (
                <div className="bg-[#16161B] p-4 rounded-xl border border-[#1C1C21] text-center space-y-2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] text-[#8E8E99] uppercase font-black tracking-wider animate-pulse">Generowanie Rekomendacji PM...</p>
                </div>
              ) : aiAnalysisResult ? (
                <div className="space-y-3">
                  <div className="bg-[#16161B] p-3.5 rounded-xl border border-blue-500/10 text-xs text-[#E0E0E6] leading-relaxed whitespace-pre-wrap font-medium">
                    {aiAnalysisResult}
                  </div>
                  <button 
                    onClick={() => setAiAnalysisResult(null)}
                    className="w-full bg-[#16161B] hover:bg-[#1C1C21] border border-[#2C2C34] text-[#8E8E99] py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition"
                  >
                    Odśwież Analizę
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAiLoading(true);
                    setTimeout(() => {
                      const urgentCount = issues.filter(i => i.priority === 'urgent' || i.priority === 'high').length;
                      const doneTasks = tasks.filter(t => t.status === 'done').length;
                      const pendingTasks = tasks.filter(t => t.status !== 'done').length;
                      let diagnosticText = `📋 DIAGNOSTYKA PROJEKTU "${project.name.toUpperCase()}"\n\n`;
                      
                      if (urgentCount > 0) {
                        diagnosticText += `🚨 KRYTYCZNE ZAGROŻENIE: Wykryto ${urgentCount} pilnych problemów serwisowych. Rekomendacja: Natychmiast oddeleguj pracownika serwisu i zaktualizuj wpis w dzienniku.\n\n`;
                      } else {
                        diagnosticText += `✅ STATUS OPERACYJNY stabilny. Brak krytycznych awarii blokujących pobór opłat.\n\n`;
                      }

                      diagnosticText += `📈 PODSUMOWANIE ZADAŃ:\n`;
                      diagnosticText += `• Zrealizowane zadania: ${doneTasks}\n`;
                      diagnosticText += `• Zadania w toku: ${pendingTasks}\n\n`;

                      diagnosticText += `💡 REKOMENDACJE DLA MANAGERA:\n`;
                      diagnosticText += `1. Zweryfikuj postępy w etapie: "${milestones.find((m: any) => !m.checked)?.label || 'Wszystkie ukończone!'}"\n`;
                      diagnosticText += `2. Skontaktuj się z Klientem (${project.client || 'Inwestor'}) w celu ustalenia terminu odbioru częściowego.\n`;
                      diagnosticText += `3. Zaktualizuj stan urządzeń w sekcji "Szczegóły umowy", jeśli dodano nowe parkomaty.`;

                      setAiAnalysisResult(diagnosticText);
                      setAiLoading(false);
                    }, 800);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  ANALIZUJ PROJEKT I WYGENERUJ REKOMENDACJE
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* REPORT VIEWER OVERLAY MODAL */}
      {showReport && (
        <div className="fixed inset-0 bg-[#0A0A0C] z-50 overflow-y-auto p-4 sm:p-6 text-slate-950">
          <div className="bg-white rounded-3xl w-full max-w-lg mx-auto shadow-2xl p-6 border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">Raport Techniczny</span>
                <h3 className="text-xl font-extrabold text-slate-900">Dziennik Projektu</h3>
              </div>
              <button 
                onClick={() => setShowReport(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print area */}
            <div id="print-area" className="space-y-5 text-xs text-slate-700">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase">Projekt: {project.name}</h4>
                <p className="text-slate-500">Lokalizacja: {project.address}</p>
                <p className="text-slate-500">Wygenerowano: {new Date().toLocaleDateString('pl-PL')}</p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h5 className="font-extrabold text-slate-900 mb-2 uppercase tracking-wide text-[10px]">1. Statystyki Bieżące</h5>
                <ul className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                  <li className="bg-slate-50 p-2 rounded">Wpisy w dzienniku: <strong className="text-slate-950 font-bold">{journalEntries.length}</strong></li>
                  <li className="bg-slate-50 p-2 rounded">Otwarte problemy: <strong className="text-red-600 font-bold">{issues.filter(i => i.status !== 'resolved').length}</strong></li>
                  <li className="bg-slate-50 p-2 rounded">Aktywne zadania: <strong className="text-blue-600 font-bold">{tasks.filter(t => t.status !== 'done').length}</strong></li>
                  <li className="bg-slate-50 p-2 rounded">Kluczowe kontakty: <strong className="text-slate-950 font-bold">{contacts.length}</strong></li>
                </ul>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h5 className="font-extrabold text-slate-900 mb-2 uppercase tracking-wide text-[10px]">2. Najważniejsze Ustalenia</h5>
                <div className="space-y-2">
                  {journalEntries.slice(0, 3).map(e => (
                    <div key={e.id} className="bg-slate-50 p-2.5 rounded">
                      <div className="flex justify-between font-bold text-slate-900 mb-1">
                        <span>{e.title}</span>
                        <span className="text-slate-500 text-[10px]">{e.date}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{e.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h5 className="font-extrabold text-slate-900 mb-2 uppercase tracking-wide text-[10px]">3. Chronologiczna Oś Czasu</h5>
                <div className="border-l border-slate-200 pl-3 ml-1 space-y-3">
                  {projectTimeline.slice(0, 5).map(ev => (
                    <div key={ev.id}>
                      <span className="text-[10px] font-bold text-slate-400">{ev.date}</span>
                      <p className="font-bold text-slate-800">{ev.title}</p>
                      <p className="text-slate-500 leading-snug">{ev.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Print Action button */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl text-xs font-bold text-slate-600 transition"
              >
                Zamknij
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Printer className="w-4 h-4" />
                Drukuj / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SUBMODALS FOR ADD ACTIONS */}
      {showAddModal === 'task' && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0F0F12] border-t border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                <CheckSquare className="w-4 h-4 text-blue-500" />
                Dodaj Zadanie
              </h3>
              <button onClick={() => setShowAddModal(null)} className="w-7 h-7 rounded-full bg-[#1C1C21] flex items-center justify-center text-[#8E8E99]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Tytuł Zadania *</label>
                <input type="text" required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Termin *</label>
                <input type="date" required value={taskDue} onChange={e => setTaskDue(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Odpowiedzialny</label>
                <input type="text" value={taskAssigned} onChange={e => setTaskAssigned(e.target.value)} placeholder="np. Tomasz Serwis" className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Priorytet</label>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as Priority)} className="w-full bg-[#16161B] border border-[#1C1C21] rounded-xl p-2.5 text-sm text-[#8E8E99]">
                  <option value="low">Niski</option>
                  <option value="normal">Normalny</option>
                  <option value="high">Wysoki</option>
                  <option value="urgent">Pilny</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Opis Zadania</label>
                <textarea rows={2} value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 py-3 rounded-xl text-xs font-bold text-white shadow-lg">Dodaj Zadanie</button>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE ADD MODAL */}
      {showAddModal === 'issue' && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0F0F12] border-t border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Zgłoś Problem
              </h3>
              <button onClick={() => setShowAddModal(null)} className="w-7 h-7 rounded-full bg-[#1C1C21] flex items-center justify-center text-[#8E8E99]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddIssueSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Tytuł Problemu *</label>
                <input type="text" required value={issueTitle} onChange={e => setIssueTitle(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Odpowiedzialny</label>
                <input type="text" value={issueAssigned} onChange={e => setIssueAssigned(e.target.value)} placeholder="np. Wykonawca" className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Priorytet</label>
                <select value={issuePriority} onChange={e => setIssuePriority(e.target.value as Priority)} className="w-full bg-[#16161B] border border-[#1C1C21] rounded-xl p-2.5 text-sm text-[#8E8E99]">
                  <option value="low">Niski</option>
                  <option value="normal">Normalny</option>
                  <option value="high">Wysoki</option>
                  <option value="urgent">Pilny (Urgent)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Opis problemu / usterki</label>
                <textarea rows={3} required value={issueDesc} onChange={e => setIssueDesc(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none" />
              </div>
              <button type="submit" className="w-full bg-red-600 py-3 rounded-xl text-xs font-bold text-white shadow-lg">Zgłoś Problem</button>
            </form>
          </div>
        </div>
      )}

      {/* CONTACT ADD MODAL */}
      {showAddModal === 'contact' && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0F0F12] border-t border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Users className="w-4 h-4 text-blue-500" />
                Dodaj Kontakt
              </h3>
              <button onClick={() => setShowAddModal(null)} className="w-7 h-7 rounded-full bg-[#1C1C21] flex items-center justify-center text-[#8E8E99]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddContactSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Imię i nazwisko *</label>
                <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Firma / Podmiot</label>
                <input type="text" value={contactCompany} onChange={e => setContactCompany(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Rola</label>
                <select value={contactRole} onChange={e => setContactRole(e.target.value as ContactRole)} className="w-full bg-[#16161B] border border-[#1C1C21] rounded-xl p-2.5 text-sm text-[#8E8E99]">
                  <option value="Klient">Klient</option>
                  <option value="Kierownik parkingu">Kierownik parkingu</option>
                  <option value="Wykonawca">Wykonawca</option>
                  <option value="Serwis">Serwis</option>
                  <option value="Ochrona">Ochrona</option>
                  <option value="Administracja">Administracja</option>
                  <option value="Inne">Inne</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Stanowisko</label>
                <input type="text" value={contactPosition} onChange={e => setContactPosition(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Telefon</label>
                <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Adres E-mail</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Notatka</label>
                <textarea rows={2} value={contactNotes} onChange={e => setContactNotes(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 py-3 rounded-xl text-xs font-bold text-white shadow-lg">Zapisz Kontakt</button>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT ADD MODAL */}
      {showAddModal === 'doc' && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0F0F12] border-t border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-blue-500" />
                Dodaj Dokument / Załącznik
              </h3>
              <button 
                onClick={() => {
                  setUploadedFile(null);
                  setShowAddModal(null);
                }} 
                className="w-7 h-7 rounded-full bg-[#1C1C21] flex items-center justify-center text-[#8E8E99]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddDocSubmit} className="space-y-4">
              {/* Drag and Drop Zone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('real-file-input')?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-[#2C2C34] bg-[#16161B] hover:border-[#3C3C44]'
                }`}
              >
                <input 
                  type="file" 
                  id="real-file-input" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                {isReadingFile ? (
                  <div className="space-y-2 py-2">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-blue-400">Wczytywanie oryginalnego pliku...</p>
                  </div>
                ) : !uploadedFile ? (
                  <div className="space-y-2">
                    <UploadCloud className="w-10 h-10 text-blue-400 mx-auto" />
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">Przeciągnij i upuść plik</p>
                      <p className="text-[10px] text-[#666670] font-semibold mt-1">Lub kliknij, aby wybrać z komputera</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <div>
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-wider truncate px-2" title={uploadedFile.name}>
                        {uploadedFile.name}
                      </p>
                      <p className="text-[10px] text-[#8E8E99] font-bold mt-1">Rozmiar pliku: {uploadedFile.size}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        setUploadedFileDataUrl(null);
                        setDocName('');
                      }}
                      className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-extrabold uppercase tracking-widest"
                    >
                      Wybierz inny plik
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Nazwa Dokumentu / Pliku *</label>
                <input 
                  type="text" 
                  required 
                  value={docName} 
                  onChange={e => setDocName(e.target.value)} 
                  placeholder="np. Protokół Odbioru Częściowego.pdf" 
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Format / Typ Pliku</label>
                  <select 
                    value={docType} 
                    onChange={e => setDocType(e.target.value as any)} 
                    className="w-full bg-[#16161B] border border-[#1C1C21] rounded-xl p-2.5 text-sm text-[#8E8E99] outline-none focus:border-blue-500/50"
                  >
                    <option value="pdf">PDF (.pdf)</option>
                    <option value="jpg">Obraz (.jpg)</option>
                    <option value="png">Obraz (.png)</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Autor wdrożenia</label>
                  <div className="w-full bg-[#16161B] border border-[#1C1C21] rounded-xl px-3 py-2.5 text-xs text-[#8E8E99] font-bold">
                    Jan Kowalski (Dyrektor)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Krótki opis / cel załącznika</label>
                <textarea 
                  rows={2} 
                  value={docDesc} 
                  onChange={e => setDocDesc(e.target.value)} 
                  placeholder="Wpisz cel dodania dokumentu..."
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none" 
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-xs font-bold text-white shadow-lg transition active:scale-95">
                ZAPISZ I UTWÓRZ WPIS Z PLIKIEM
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTACT MODAL */}
      {editingContact && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F0F12] border border-[#1F1F24] rounded-2xl w-full max-w-md p-5 shadow-2xl overflow-y-auto max-h-[90vh] text-left animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#1C1C21]">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Edytuj Osobę Kontaktową
              </h3>
              <button 
                onClick={() => setEditingContact(null)} 
                className="w-7 h-7 rounded-full bg-[#16161B] hover:bg-[#25252D] flex items-center justify-center text-[#8E8E99] hover:text-white transition border border-[#1C1C21]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateContactSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Imię i Nazwisko *</label>
                <input 
                  type="text" 
                  required 
                  value={editContactName} 
                  onChange={e => setEditContactName(e.target.value)} 
                  placeholder="np. Piotr Zieliński" 
                  className="w-full bg-[#16161B] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Firma / Podmiot *</label>
                  <input 
                    type="text" 
                    required 
                    value={editContactCompany} 
                    onChange={e => setEditContactCompany(e.target.value)} 
                    placeholder="np. Galeria Handlowa" 
                    className="w-full bg-[#16161B] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Rola w Projekcie</label>
                  <select 
                    value={editContactRole} 
                    onChange={e => setEditContactRole(e.target.value as ContactRole)} 
                    className="w-full bg-[#16161B] border border-[#2C2C34] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/60"
                  >
                    <option value="Klient">Klient</option>
                    <option value="Kierownik parkingu">Kierownik parkingu</option>
                    <option value="Wykonawca">Wykonawca</option>
                    <option value="Serwis">Serwis</option>
                    <option value="Ochrona">Ochrona</option>
                    <option value="Administracja">Administracja</option>
                    <option value="Inne">Inne</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Stanowisko</label>
                <input 
                  type="text" 
                  value={editContactPosition} 
                  onChange={e => setEditContactPosition(e.target.value)} 
                  placeholder="np. Dyrektor Operacyjny" 
                  className="w-full bg-[#16161B] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Telefon</label>
                  <input 
                    type="tel" 
                    value={editContactPhone} 
                    onChange={e => setEditContactPhone(e.target.value)} 
                    placeholder="+48 600 000 000" 
                    className="w-full bg-[#16161B] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">E-mail</label>
                  <input 
                    type="email" 
                    value={editContactEmail} 
                    onChange={e => setEditContactEmail(e.target.value)} 
                    placeholder="kontakt@domena.pl" 
                    className="w-full bg-[#16161B] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Notatki / Informacje dodatkowe</label>
                <textarea 
                  rows={2} 
                  value={editContactNotes} 
                  onChange={e => setEditContactNotes(e.target.value)} 
                  placeholder="Informacje kontaktowe, dostępność, uwagi..." 
                  className="w-full bg-[#16161B] border border-[#2C2C34] focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none" 
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button 
                  type="button" 
                  onClick={() => setEditingContact(null)} 
                  className="flex-1 bg-[#16161B] hover:bg-[#25252D] text-[#8E8E99] hover:text-white py-2.5 rounded-xl text-xs font-bold transition border border-[#2C2C34]"
                >
                  Anuluj
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-950/40 active:scale-95"
                >
                  Zapisz Zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {isEditingProj && (
        <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0F0F12] border-t border-[#1F1F24] rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl overflow-y-auto max-h-[90vh] text-left">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                <span>✏️</span>
                Edycja Danych Projektu
              </h3>
              <button onClick={() => setIsEditingProj(false)} className="w-7 h-7 rounded-full bg-[#1C1C21] flex items-center justify-center text-[#8E8E99] hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Nazwa Projektu *</label>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Lokalizacja / Adres *</label>
                <input type="text" required value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Klient / Inwestor</label>
                  <input type="text" value={editClient} onChange={e => setEditClient(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="w-full bg-[#16161B] border border-[#2C2C34] rounded-xl p-2.5 text-sm text-white focus:border-blue-500/50 outline-none">
                    <option value="OK">OK</option>
                    <option value="WARNING">Ostrzeżenie (WARNING)</option>
                    <option value="PROBLEM">Problem (PROBLEM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Data Rozpoczęcia</label>
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Data Zakończenia (lub puste)</label>
                  <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Wynagrodzenie dla City Parking Group</label>
                <input type="text" value={editRemuneration} onChange={e => setEditRemuneration(e.target.value)} placeholder="np. ryczałt 5500 PLN netto / miesięcznie" className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Zakres Prac (Ogólny)</label>
                <textarea rows={3} value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-y" />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Spis Urządzeń (zainstalowanych / planowanych)</label>
                <textarea rows={3} value={editEquipment} onChange={e => setEditEquipment(e.target.value)} placeholder="np. 4 szt. Parkomatów CPG, 2 szt. kamer ANPR Hikvision" className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-y" />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">Notatki Wewnętrzne / Techniczne</label>
                <textarea rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-y" />
              </div>

              <div className="border-t border-[#1F1F24] pt-4">
                <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider mb-2">Dane Wyodrębnione z Umowy (AI)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-[#666670] mb-1">Dane Kontaktowe Zamawiającego</label>
                    <textarea rows={2} value={editContact} onChange={e => setEditContact(e.target.value)} className="w-full bg-[#16161B] border border-[#1C1C21] focus:border-blue-500/50 rounded-xl p-2.5 text-xs text-white outline-none resize-y" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-[#666670] mb-1">Terminy Rozliczeń i Płatności</label>
                    <textarea rows={2} value={editBilling} onChange={e => setEditBilling(e.target.value)} className="w-full bg-[#16161B] border border-[#1C1C21] focus:border-blue-500/50 rounded-xl p-2.5 text-xs text-white outline-none resize-y" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-[#666670] mb-1">Zakres Obowiązków Umownych</label>
                    <textarea rows={2} value={editScope} onChange={e => setEditScope(e.target.value)} className="w-full bg-[#16161B] border border-[#1C1C21] focus:border-blue-500/50 rounded-xl p-2.5 text-xs text-white outline-none resize-y" />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-[#666670] mb-1">Inne Istotne Warunki i Kary</label>
                    <textarea rows={2} value={editKeyPoints} onChange={e => setEditKeyPoints(e.target.value)} className="w-full bg-[#16161B] border border-[#1C1C21] focus:border-blue-500/50 rounded-xl p-2.5 text-xs text-white outline-none resize-y" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setIsEditingProj(false)} className="flex-1 bg-[#1C1C21] hover:bg-[#2C2C34] text-[#8E8E99] hover:text-white py-3 rounded-xl text-xs font-bold transition">
                  Anuluj
                </button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg transition">
                  Zapisz Zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. PHOTO LIGHTBOX / FULLSCREEN PREVIEW MODAL */}
      {previewPhotoIndex !== null && projectPhotos[previewPhotoIndex] && (() => {
        const ph = projectPhotos[previewPhotoIndex];
        return (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 to-transparent z-10">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-[#1C1C21] text-xs font-black text-white border border-[#2C2C34]">
                  {previewPhotoIndex + 1} / {projectPhotos.length}
                </span>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-white truncate max-w-xs">{ph.entryTitle}</p>
                  <p className="text-[10px] text-[#8E8E99]">{ph.date} {ph.time} • {ph.author}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Zoom out */}
                <button
                  onClick={() => setPreviewZoom(prev => Math.max(0.75, prev - 0.25))}
                  className="p-2 rounded-xl bg-[#1C1C21]/80 hover:bg-[#2C2C34] text-[#8E8E99] hover:text-white border border-[#2C2C34] transition"
                  title="Oddal"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                {/* Zoom in */}
                <button
                  onClick={() => setPreviewZoom(prev => Math.min(3, prev + 0.25))}
                  className="p-2 rounded-xl bg-[#1C1C21]/80 hover:bg-[#2C2C34] text-[#8E8E99] hover:text-white border border-[#2C2C34] transition"
                  title="Przybliż"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {previewZoom !== 1 && (
                  <button
                    onClick={() => setPreviewZoom(1)}
                    className="p-2 rounded-xl bg-[#1C1C21]/80 hover:bg-[#2C2C34] text-[#8E8E99] hover:text-white border border-[#2C2C34] transition"
                    title="Resetuj powiększenie"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {/* Download */}
                <button
                  onClick={() => handleDownloadPhoto(ph, previewPhotoIndex + 1)}
                  className="px-3 py-2 rounded-xl bg-[#1C1C21]/80 hover:bg-blue-600 text-white border border-[#2C2C34] text-xs font-bold flex items-center gap-1.5 transition"
                  title="Pobierz zdjęcie"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">Pobierz</span>
                </button>

                {/* Share via Email */}
                <button
                  onClick={() => handleOpenEmailModal([ph])}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                  title="Udostępnij przez e-mail"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden md:inline">Wyślij e-mail</span>
                </button>

                {/* Native Share */}
                {'share' in navigator && (
                  <button
                    onClick={() => handleNativeShare(ph)}
                    className="p-2 rounded-xl bg-[#1C1C21]/80 hover:bg-[#2C2C34] text-[#8E8E99] hover:text-white border border-[#2C2C34] transition"
                    title="Udostępnij w systemie"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => {
                    setDeletingPhotoItem({
                      entryId: ph.entryId,
                      photoIndex: ph.photoIndex,
                      title: ph.entryTitle
                    });
                  }}
                  className="p-2 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/40 transition"
                  title="Usuń zdjęcie"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Close */}
                <button
                  onClick={() => {
                    setPreviewPhotoIndex(null);
                    setPreviewZoom(1);
                  }}
                  className="p-2 rounded-xl bg-[#1C1C21]/80 hover:bg-[#2C2C34] text-white border border-[#2C2C34] transition"
                  title="Zamknij (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Stage with Arrows and Image */}
            <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
              {/* Prev Button */}
              <button
                onClick={() => {
                  setPreviewPhotoIndex(prev => (prev !== null && prev > 0 ? prev - 1 : projectPhotos.length - 1));
                  setPreviewZoom(1);
                }}
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 flex items-center justify-center transition backdrop-blur-sm"
                title="Poprzednie (Strzałka w lewo)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Centered Image */}
              <div className="max-w-full max-h-[75vh] flex items-center justify-center transition-transform duration-200" style={{ transform: `scale(${previewZoom})` }}>
                <img
                  src={ph.url}
                  alt={ph.entryTitle}
                  className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Next Button */}
              <button
                onClick={() => {
                  setPreviewPhotoIndex(prev => (prev !== null && prev < projectPhotos.length - 1 ? prev + 1 : 0));
                  setPreviewZoom(1);
                }}
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 flex items-center justify-center transition backdrop-blur-sm"
                title="Następne (Strzałka w prawo)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Metadata Drawer */}
            <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-3 sm:p-5 z-10">
              <div className="max-w-3xl mx-auto bg-[#16161B]/95 border border-[#2C2C34] rounded-2xl p-3.5 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-extrabold text-sm">{ph.entryTitle}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/30 text-[10px] font-bold">
                      {ph.sourceType === 'issue' ? 'Usterka' : 'Dziennik'}
                    </span>
                    {ph.category && (
                      <span className="px-2 py-0.5 rounded bg-[#25252D] text-[#8E8E99] text-[10px] font-bold uppercase">
                        {ph.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[#8E8E99] text-[11px] font-medium flex-wrap">
                    <span>Data: <strong>{ph.date}</strong> {ph.time}</span>
                    <span>Autor: <strong>{ph.author}</strong></span>
                    <span>Projekt: <strong>{project.name}</strong></span>
                  </div>
                </div>

                {ph.gps && (() => {
                  const lat: number | undefined = (ph.gps as any)?.latitude ?? (ph.gps as any)?.lat;
                  const lng: number | undefined = (ph.gps as any)?.longitude ?? (ph.gps as any)?.lng;
                  const hasCoords = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

                  return (
                    <div className="flex items-center gap-2 self-start sm:self-auto bg-[#1C1C21] p-2 rounded-xl border border-[#2C2C34]">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="text-[10px] leading-tight">
                        <p className="text-white font-bold truncate max-w-[200px]">{ph.gps.address || (hasCoords ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Współrzędne GPS')}</p>
                        {hasCoords && (
                          <p className="text-[#8E8E99]">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
                        )}
                      </div>
                      {hasCoords && (
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white ml-1"
                          title="Otwórz w Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. EMAIL SHARE MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-[#16161B] border border-[#2C2C34] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#2C2C34] flex items-center justify-between bg-[#1C1C21]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-950/40 border border-blue-900/30 flex items-center justify-center text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Udostępnij zdjęcia przez e-mail</h3>
                  <p className="text-[11px] text-[#8E8E99]">
                    Przygotowano do wysyłki: <strong className="text-white">{emailPhotosToSend.length}</strong> {emailPhotosToSend.length === 1 ? 'zdjęcie' : 'zdjęć'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1.5 rounded-lg text-[#8E8E99] hover:text-white hover:bg-[#2C2C34] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Photo Thumbnails Preview */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-2 tracking-wider">
                  Załączone zdjęcia ({emailPhotosToSend.length})
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {emailPhotosToSend.map((photo, i) => (
                    <div key={photo.id || i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#2C2C34] shrink-0 bg-[#0F0F12]">
                      <img src={photo.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-[#8E8E99] text-center font-bold truncate px-1">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Contact Chips */}
              {contacts.length > 0 && (
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">
                    Szybki wybór odbiorcy z listy kontaktów projektu:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {contacts.filter(c => c.email).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEmailRecipient(c.email)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
                          emailRecipient === c.email
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-[#1C1C21] hover:bg-[#25252D] border-[#2C2C34] text-[#8E8E99] hover:text-white'
                        }`}
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] opacity-70">({c.role})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient Input */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1 tracking-wider">
                  Adres e-mail odbiorcy
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="np. kierownik@klient.pl, inwestor@galeria.pl"
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1 tracking-wider">
                  Temat wiadomości
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1 tracking-wider">
                  Dodatkowy komentarz / notatka do wiadomości (opcjonalnie)
                </label>
                <textarea
                  rows={3}
                  value={emailNotes}
                  onChange={(e) => setEmailNotes(e.target.value)}
                  placeholder="np. Przesyłam zdjęcia z montażu parkomatu nr 3 oraz uszkodzonego czujnika wjazdu..."
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none resize-y"
                />
              </div>

              {/* Message Summary Preview */}
              <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-xl p-3 text-[11px] text-[#8E8E99] space-y-1">
                <p className="font-bold text-white">Podsumowanie treści wiadomości:</p>
                <p>• Projekt: <span className="text-white">{project.name}</span></p>
                <p>• Lokalizacja: <span className="text-white">{project.address}</span></p>
                <p>• Liczba wyszczególnionych zdjęć z datami i GPS: <span className="text-white">{emailPhotosToSend.length}</span></p>
              </div>

              {/* Browser Attachment Notice Banner */}
              <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3.5 text-[11px] text-blue-300 flex flex-col gap-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Jak załączyć oryginalne zdjęcia do wiadomości?</span>
                </p>
                <p className="leading-relaxed">
                  Przeglądarki internetowe ze względów bezpieczeństwa nie pozwalają na automatyczne dołączanie fizycznych plików przez linki pocztowe. Pobierz zdjęcia na dysk poniższym przyciskiem, a następnie przeciągnij je do okna otwartego programu pocztowego.
                </p>
                <button
                  type="button"
                  onClick={() => handleDownloadBatch(emailPhotosToSend)}
                  className="mt-1 self-start px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-950 transition active:scale-95"
                >
                  <Download className="w-3 h-3" />
                  <span>Pobierz zdjęcia ({emailPhotosToSend.length}) na dysk</span>
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#2C2C34] bg-[#1C1C21] flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleCopyEmailText}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[#25252D] hover:bg-[#32323D] text-[#8E8E99] hover:text-white border border-[#2C2C34] text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                {copiedEmailText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Skopiowano treść!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiuj treść e-mail</span>
                  </>
                )}
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#25252D] text-[#8E8E99] hover:text-white text-xs font-bold transition text-center"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => handleNativeShareBatch(emailPhotosToSend.map(p => ({ name: p.entryTitle || 'Zdjęcie', url: p.url, addedDate: p.date })))}
                  className="px-4 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  title="Udostępnij zdjęcia bezpośrednio przez systemowy program pocztowy"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Natywne udostępnianie</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONFIRM DELETE SINGLE PHOTO MODAL */}
      {deletingPhotoItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#16161B] border border-red-900/40 rounded-2xl w-full max-w-sm p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Usunąć to zdjęcie?</h4>
              <p className="text-xs text-[#8E8E99] mt-1 leading-relaxed">
                Zdjęcie z wpisu &ldquo;{deletingPhotoItem.title}&rdquo; zostanie bezpowrotnie usunięte z dokumentacji projektu.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPhotoItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1C1C21] hover:bg-[#25252D] text-[#8E8E99] hover:text-white text-xs font-bold transition border border-[#2C2C34]"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSinglePhoto}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wide shadow-lg shadow-red-950/30 transition active:scale-95"
              >
                Usuń zdjęcie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIRM BATCH DELETE PHOTOS MODAL */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#16161B] border border-red-900/40 rounded-2xl w-full max-w-sm p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Usunąć zaznaczone zdjęcia?</h4>
              <p className="text-xs text-[#8E8E99] mt-1 leading-relaxed">
                Czy na pewno chcesz usunąć <strong className="text-white">{selectedPhotoIds.length}</strong> zaznaczonych zdjęć z tego projektu? Tej operacji nie można cofnąć.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1C1C21] hover:bg-[#25252D] text-[#8E8E99] hover:text-white text-xs font-bold transition border border-[#2C2C34]"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wide shadow-lg shadow-red-950/30 transition active:scale-95"
              >
                Usuń ({selectedPhotoIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD DIRECT PHOTOS MODAL */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#16161B] border border-[#2C2C34] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C34]">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-white">Dodaj zdjęcia do projektu</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddPhotoModal(false);
                  setNewPhotoList([]);
                  setNewPhotoCaption('');
                }}
                className="p-1.5 rounded-lg text-[#8E8E99] hover:text-white hover:bg-[#2C2C34] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDirectPhotos} className="space-y-4">
              {/* File upload input */}
              <input
                ref={directPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleDirectPhotoFilesSelected}
                className="hidden"
              />

              <div
                onClick={() => directPhotoInputRef.current?.click()}
                className="border-2 border-dashed border-[#2C2C34] hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer bg-[#1C1C21]/50 hover:bg-[#1C1C21] transition"
              >
                <Camera className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-white">Kliknij, aby wybrać zdjęcia z dysku lub aparatu</p>
                <p className="text-[10px] text-[#8E8E99] mt-0.5">Obsługuje wiele plików JPG, PNG, WEBP</p>
              </div>

              {/* Sample Photo Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddSampleDirectPhoto}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Wstaw przykładowe zdjęcie techniczne
                </button>
              </div>

              {/* Thumbnails preview */}
              {newPhotoList.length > 0 && (
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-2 tracking-wider">
                    Wybrane zdjęcia ({newPhotoList.length})
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-[#121216] rounded-xl border border-[#2C2C34]">
                    {newPhotoList.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[#2C2C34]">
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setNewPhotoList(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded bg-black/80 text-white flex items-center justify-center hover:bg-red-600 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1 tracking-wider">
                  Opis / Tytuł zestawu zdjęć (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="np. Stan nawierzchni przed montażem parkomatów"
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPhotoModal(false);
                    setNewPhotoList([]);
                    setNewPhotoCaption('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#1C1C21] hover:bg-[#25252D] text-[#8E8E99] hover:text-white text-xs font-bold transition border border-[#2C2C34]"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={newPhotoList.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black tracking-wide shadow-lg transition active:scale-95"
                >
                  Zapisz zdjęcia ({newPhotoList.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 6. DOCUMENT VIEWER MODAL */}
      {previewDocIndex !== null && projectDocuments[previewDocIndex] && (() => {
        const doc = projectDocuments[previewDocIndex];
        const isImage = doc.type === 'jpg' || doc.type === 'png' || (doc.url && (doc.url.startsWith('data:image') || doc.url.includes('unsplash') || doc.url.endsWith('.jpg') || doc.url.endsWith('.png') || doc.url.endsWith('.webp')));

        return (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-fade-in select-none">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black via-black/80 to-transparent z-20">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="px-2.5 py-1 rounded-lg bg-[#1C1C21] text-[#8E8E99] border border-[#2C2C34] text-[11px] font-bold shrink-0">
                  {previewDocIndex + 1} / {projectDocuments.length}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white break-words max-w-full" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-[10px] text-[#8E8E99] break-words">
                    {doc.size} • {doc.addedDate} • {doc.author}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Open in New Window */}
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-[#1C1C21]/80 hover:bg-[#2C2C34] text-[#8E8E99] hover:text-white border border-[#2C2C34] transition"
                  title="Otwórz w nowym oknie"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Delete */}
                <button
                  onClick={() => {
                    setDeletingDocItem({
                      id: doc.id,
                      entryId: doc.entryId,
                      docIndex: doc.docIndex,
                      name: doc.name
                    });
                  }}
                  className="p-2 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/40 transition"
                  title="Usuń plik"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Close */}
                <button
                  onClick={() => setPreviewDocIndex(null)}
                  className="p-2 rounded-xl bg-[#1C1C21]/80 hover:bg-[#2C2C34] text-white border border-[#2C2C34] transition"
                  title="Zamknij (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Stage with Navigation Arrows */}
            <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
              {/* Prev Button */}
              <button
                onClick={() => {
                  setPreviewDocIndex(prev => (prev !== null && prev > 0 ? prev - 1 : projectDocuments.length - 1));
                }}
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 flex items-center justify-center transition backdrop-blur-sm"
                title="Poprzedni (Strzałka w lewo)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Document Presentation */}
              <div className="max-w-2xl w-full flex items-center justify-center p-4">
                {isImage ? (
                  <img
                    src={activePreviewDocUrl || (doc.url && doc.url !== '#' ? doc.url : undefined)}
                    alt={doc.name}
                    className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl border border-[#2C2C34]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="bg-[#16161B] border border-[#2C2C34] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl text-center space-y-5">
                    <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center mx-auto shadow-xl ${
                      doc.type === 'pdf' ? 'bg-red-950/30 border-red-900/40 text-red-400' :
                      doc.type === 'xlsx' ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400' :
                      doc.type === 'docx' ? 'bg-blue-950/30 border-blue-900/40 text-blue-400' :
                      'bg-purple-950/30 border-purple-900/40 text-purple-400'
                    }`}>
                      <FileText className="w-10 h-10" />
                    </div>

                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-2 border ${
                        doc.type === 'pdf' ? 'bg-red-950/40 border-red-900/40 text-red-400' :
                        doc.type === 'xlsx' ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400' :
                        doc.type === 'docx' ? 'bg-blue-950/40 border-blue-900/40 text-blue-400' :
                        'bg-purple-950/40 border-purple-900/40 text-purple-400'
                      }`}>
                        DOKUMENT {doc.type}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white break-words" title={doc.name}>
                        {doc.name}
                      </h3>
                      <p className="text-xs text-[#8E8E99] mt-1">
                        Rozmiar: <strong className="text-white">{doc.size}</strong> • Data dodania: <strong className="text-white">{doc.addedDate}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {}}
                        className="hidden"
                      >
                        <Download className="w-4 h-4" />
                        <span>Pobierz plik na dysk</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenFileWindow(doc)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#25252D] hover:bg-[#32323D] text-[#8E8E99] hover:text-white border border-[#2C2C34] text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Otwórz w oknie</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={() => {
                  setPreviewDocIndex(prev => (prev !== null && prev < projectDocuments.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 flex items-center justify-center transition backdrop-blur-sm"
                title="Następny (Strzałka w prawo)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Metadata Drawer */}
            <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-3 sm:p-5 z-10">
              <div className="max-w-3xl mx-auto bg-[#16161B]/95 border border-[#2C2C34] rounded-2xl p-3.5 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-extrabold text-sm">{doc.name}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/30 text-[10px] font-bold">
                      {doc.entryTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[#8E8E99] text-[11px] font-medium flex-wrap">
                    <span>Data: <strong>{doc.addedDate}</strong></span>
                    <span>Autor: <strong>{doc.author}</strong></span>
                    <span>Projekt: <strong>{project.name}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. DOCUMENT EMAIL SHARE MODAL */}
      {showDocEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-[#16161B] border border-[#2C2C34] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#2C2C34] flex items-center justify-between bg-[#1C1C21]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-950/40 border border-blue-900/30 flex items-center justify-center text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Udostępnij pliki przez e-mail</h3>
                  <p className="text-[11px] text-[#8E8E99]">
                    Przygotowano do wysyłki: <strong className="text-white">{emailDocsToSend.length}</strong> {emailDocsToSend.length === 1 ? 'plik' : 'plików'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDocEmailModal(false)}
                className="p-1.5 rounded-lg text-[#8E8E99] hover:text-white hover:bg-[#2C2C34] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Files Preview Chips */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-2 tracking-wider">
                  Załączone pliki ({emailDocsToSend.length})
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {emailDocsToSend.map((d, i) => (
                    <div key={d.id || i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#2C2C34] bg-[#0F0F12] text-xs">
                      <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-bold text-white truncate max-w-[140px]">{d.name}</span>
                      <span className="text-[10px] text-[#8E8E99]">({d.size})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Contact Chips */}
              {contacts.length > 0 && (
                <div>
                  <label className="block text-[10px] uppercase font-black text-[#666670] mb-1.5 tracking-wider">
                    Szybki wybór odbiorcy z kontaktów projektu:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {contacts.filter(c => c.email).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setDocEmailRecipient(c.email)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
                          docEmailRecipient === c.email
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-[#1C1C21] hover:bg-[#25252D] border-[#2C2C34] text-[#8E8E99] hover:text-white'
                        }`}
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] opacity-70">({c.role})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient Input */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1 tracking-wider">
                  Adres e-mail odbiorcy
                </label>
                <input
                  type="email"
                  value={docEmailRecipient}
                  onChange={(e) => setDocEmailRecipient(e.target.value)}
                  placeholder="np. inwestor@klient.pl, kierownik@budowa.pl"
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1 tracking-wider">
                  Temat wiadomości
                </label>
                <input
                  type="text"
                  value={docEmailSubject}
                  onChange={(e) => setDocEmailSubject(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-[10px] uppercase font-black text-[#666670] mb-1 tracking-wider">
                  Dodatkowy komentarz / notatka do wiadomości (opcjonalnie)
                </label>
                <textarea
                  rows={3}
                  value={docEmailNotes}
                  onChange={(e) => setDocEmailNotes(e.target.value)}
                  placeholder="np. W załączeniu przesyłam zaktualizowaną dokumentację powykonawczą, protokół odbioru oraz certyfikaty..."
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none resize-y"
                />
              </div>

              {/* Message Summary Preview */}
              <div className="bg-[#1C1C21] border border-[#2C2C34] rounded-xl p-3 text-[11px] text-[#8E8E99] space-y-1">
                <p className="font-bold text-white">Podsumowanie wiadomości:</p>
                <p>• Projekt: <span className="text-white">{project.name}</span></p>
                <p>• Lokalizacja: <span className="text-white">{project.address}</span></p>
                <p>• Liczba wyszczególnionych plików w zestawie: <span className="text-white">{emailDocsToSend.length}</span></p>
              </div>

              {/* Browser Attachment Notice Banner */}
              <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3.5 text-[11px] text-blue-300 flex flex-col gap-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Jak załączyć oryginalne dokumenty do wiadomości?</span>
                </p>
                <p className="leading-relaxed">
                  Przeglądarki internetowe ze względów bezpieczeństwa nie pozwalają na automatyczne dołączanie fizycznych plików przez linki pocztowe. Pobierz dokumenty na dysk poniższym przyciskiem, a następnie przeciągnij je do okna otwartego programu pocztowego.
                </p>
                <button
                  type="button"
                  onClick={() => handleDownloadDocBatch(emailDocsToSend)}
                  className="mt-1 self-start px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-950 transition active:scale-95"
                >
                  <Download className="w-3 h-3" />
                  <span>Pobierz pliki ({emailDocsToSend.length}) na dysk</span>
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#2C2C34] bg-[#1C1C21] flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleCopyDocEmailText}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[#25252D] hover:bg-[#32323D] text-[#8E8E99] hover:text-white border border-[#2C2C34] text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                {copiedDocEmailText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Skopiowano treść!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiuj treść e-mail</span>
                  </>
                )}
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDocEmailModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#25252D] text-[#8E8E99] hover:text-white text-xs font-bold transition text-center"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => handleNativeShareBatch(emailDocsToSend.map(d => ({ name: d.name, url: d.url })))}
                  className="px-4 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  title="Udostępnij pliki bezpośrednio przez systemowy program pocztowy"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Natywne udostępnianie</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. CONFIRM DELETE SINGLE DOCUMENT MODAL */}
      {deletingDocItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#16161B] border border-red-900/40 rounded-2xl w-full max-w-sm p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Usunąć ten dokument?</h4>
              <p className="text-xs text-[#8E8E99] mt-1 leading-relaxed">
                Plik &ldquo;{deletingDocItem.name}&rdquo; zostanie bezpowrotnie usunięty z dokumentacji projektu.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDocItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1C1C21] hover:bg-[#25252D] text-[#8E8E99] hover:text-white text-xs font-bold transition border border-[#2C2C34]"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingleDoc}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wide shadow-lg shadow-red-950/30 transition active:scale-95"
              >
                Usuń plik
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. CONFIRM BATCH DELETE DOCUMENTS MODAL */}
      {showBatchDeleteDocConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#16161B] border border-red-900/40 rounded-2xl w-full max-w-sm p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/40 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Usunąć zaznaczone pliki?</h4>
              <p className="text-xs text-[#8E8E99] mt-1 leading-relaxed">
                Czy na pewno chcesz usunąć <strong className="text-white">{selectedDocIds.length}</strong> zaznaczonych plików z tego projektu? Tej operacji nie można cofnąć.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteDocConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1C1C21] hover:bg-[#25252D] text-[#8E8E99] hover:text-white text-xs font-bold transition border border-[#2C2C34]"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDeleteDocs}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wide shadow-lg shadow-red-950/30 transition active:scale-95"
              >
                Usuń ({selectedDocIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
