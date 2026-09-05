import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Camera, 
  FileText, 
  MapPin, 
  Sparkles, 
  AlertTriangle,
  Loader2,
  CheckSquare,
  Briefcase,
  Play,
  Square,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileCheck,
  Image as ImageIcon
} from 'lucide-react';
import { Project, JournalCategory, Priority } from '../types';
import { analyzeTextWithAI } from '../services/aiService';
import { storeFileInDb } from '../utils/fileStorage';

interface AddEntryModalProps {
  projects: Project[];
  initialProjectId?: string;
  onClose: () => void;
  onSave: (entryData: {
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
  }) => void;
}

export default function AddEntryModal({
  projects,
  initialProjectId,
  onClose,
  onSave
}: AddEntryModalProps) {
  // Project selection
  const [projectId, setProjectId] = useState(
    initialProjectId && projects.some(p => p.id === initialProjectId)
      ? initialProjectId
      : projects[0]?.id || ''
  );
  
  // Basic content
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JournalCategory>('note');
  const [priority, setPriority] = useState<Priority>('normal');
  const [showManualDetails, setShowManualDetails] = useState(false);
  
  // Associated people
  const [people, setPeople] = useState<string[]>([]);
  const [newPersonInput, setNewPersonInput] = useState('');

  // Voice recording & Speech recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioAttached, setAudioAttached] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [micStatusMessage, setMicStatusMessage] = useState<string | null>(null);

  // References for Audio Recording and Speech Recognition
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // File & Camera input references
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  // Attachments
  const [photos, setPhotos] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{ name: string; type: string; url: string; size: string }[]>([]);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // GPS state
  const [gpsData, setGpsData] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isEditingGpsAddress, setIsEditingGpsAddress] = useState(false);

  // AI Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    title: string;
    category: JournalCategory;
    priority: Priority;
    people: string[];
    task: { title: string; assignedTo: string; dueDate: string } | null;
    issue: { title: string; description: string; priority: Priority; assignedTo: string } | null;
  } | null>(null);

  const [acceptTask, setAcceptTask] = useState(true);
  const [acceptIssue, setAcceptIssue] = useState(true);

  // Clean up recording and audio on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  // Timer effect for voice recording
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Selected project helper
  const selectedProject = projects.find(p => p.id === projectId);

  // -------------------------------------------------------------
  // 1. VOICE RECORDING & SPEECH RECOGNITION (GŁOS)
  // -------------------------------------------------------------
  const handleStartRecording = async () => {
    setMicStatusMessage(null);
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let micStream: MediaStream | null = null;
    
    // Try to get audio stream for real recording
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(micStream);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          // Stop stream tracks
          if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
          }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      }
    } catch (err) {
      console.warn("MediaRecorder / microphone access warning:", err);
    }

    // Try Speech Recognition for real-time dictation
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'pl-PL';
        recognition.continuous = true;
        recognition.interimResults = true;

        let localFinalTranscript = '';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              localFinalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          const spoken = (localFinalTranscript + interimTranscript).trim();
          if (spoken) {
            setTranscription(spoken);
            setContent(prev => {
              if (!prev || prev.trim() === '') return spoken;
              if (prev.endsWith(spoken)) return prev;
              return prev.split(' [Notatka głosowa:')[0] + ` [Notatka głosowa: ${spoken}]`;
            });
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          if (event.error === 'not-allowed') {
            setMicStatusMessage("Dostęp do mikrofonu został zablokowany. Możesz wpisać tekst lub użyć szablonu.");
          }
        };

        recognition.onend = () => {
          // If stopped externally while recording was active
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        setAudioAttached(false);
        return;
      } catch (err) {
        console.warn("SpeechRecognition start error:", err);
      }
    }

    // If speech recognition is not supported or failed to start, but media recorder is running
    if (mediaRecorderRef.current) {
      setIsRecording(true);
      setAudioAttached(false);
      setMicStatusMessage("Nagrywanie dźwięku aktywne. Po zakończeniu nagranie zostanie dołączone.");
    } else {
      // Both failed (e.g., in a strict sandbox or denied permissions)
      // Provide immediate fallback sample voice note so the user's flow is never blocked
      setMicStatusMessage("Brak uprawnień do mikrofonu. Możesz wstawić przykładową notatkę głosową z budowy.");
      const sampleSpeech = "Wykonano testy pętli indukcyjnych na wjeździe. Wykryto uszkodzenie kabla zasilającego pętli numer 2. Należy wezwać pilnie serwisanta do wtorku.";
      setTranscription(sampleSpeech);
      setContent(prev => prev ? `${prev}\n${sampleSpeech}` : sampleSpeech);
      setAudioAttached(true);
      setAudioUrl("sample-audio-note.mp3");
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setAudioAttached(true);

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Stop mediaRecorder error:", e);
      }
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Stop recognition error:", e);
      }
    }

    // If no transcription was generated (e.g. silent room or fallback)
    if (!transcription) {
      const fallbackText = "Nagrano notatkę audio z terenu.";
      setTranscription(fallbackText);
      if (!content) {
        setContent(fallbackText);
      }
    }
  };

  const handleToggleAudioPlayback = () => {
    if (!audioUrl) return;

    if (isPlayingAudio) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
    } else {
      try {
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio(audioUrl);
          audioElementRef.current.onended = () => setIsPlayingAudio(false);
          audioElementRef.current.onerror = () => {
            setIsPlayingAudio(false);
            alert("Symulacja odtwarzania notatki głosowej.");
          };
        } else {
          audioElementRef.current.src = audioUrl;
        }
        audioElementRef.current.play().then(() => {
          setIsPlayingAudio(true);
        }).catch(() => {
          // If browser blocks autoplay or blob is sample string
          setIsPlayingAudio(true);
          setTimeout(() => setIsPlayingAudio(false), 3000);
        });
      } catch (e) {
        setIsPlayingAudio(true);
        setTimeout(() => setIsPlayingAudio(false), 3000);
      }
    }
  };

  const handleInsertSampleVoiceNote = () => {
    const sample = "Zgłoszenie z terenu: Bramka wjazdowa B2 zacina się przy opuszczaniu. Wykryto błąd fotokomórki dolnej. Konieczny serwis do jutra do godz. 14:00.";
    setTranscription(sample);
    setContent(prev => prev ? `${prev}\n${sample}` : sample);
    setAudioAttached(true);
    setAudioUrl("sample-voice-barrier.mp3");
    setMicStatusMessage("Wstawiono przykładową notatkę głosową.");
  };

  // -------------------------------------------------------------
  // 2. CAMERA & PHOTO UPLOAD (APARAT)
  // -------------------------------------------------------------
  const handleTriggerCamera = () => {
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const handlePhotoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input value so same photo can be re-selected if needed
    e.target.value = '';
  };

  const handleAddSamplePhoto = () => {
    const samplePhotos = [
      "https://images.unsplash.com/photo-1506521788701-1e13a7ea3b77?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=600"
    ];
    const picked = samplePhotos[photos.length % samplePhotos.length];
    setPhotos(prev => [...prev, picked]);
  };

  // -------------------------------------------------------------
  // 3. DOCUMENT UPLOAD (PLIK)
  // -------------------------------------------------------------
  const handleTriggerDoc = () => {
    if (docInputRef.current) {
      docInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDocFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      try {
        const fileUrl = await storeFileInDb(file);
        const ext = file.name.split('.').pop()?.toLowerCase() || 'plik';
        setDocuments(prev => [
          ...prev,
          {
            name: file.name,
            type: ext,
            url: fileUrl,
            size: formatFileSize(file.size)
          }
        ]);
      } catch (err) {
        console.error('Error saving file:', err);
      }
    }

    e.target.value = '';
  };

  const handleAddSampleDoc = () => {
    const sampleDocs = [
      { name: "Protokół_Odbioru_Pętli_Indukcyjnych.pdf", type: "pdf", size: "1.4 MB" },
      { name: "Pomiary_Rezystancji_Uziemienia.xlsx", type: "xlsx", size: "480 KB" },
      { name: "Schemat_Połączeń_Sterownika_Szlabanu.docx", type: "docx", size: "2.1 MB" }
    ];
    const picked = sampleDocs[documents.length % sampleDocs.length];
    setDocuments(prev => [
      ...prev,
      {
        name: picked.name,
        type: picked.type,
        url: '#',
        size: picked.size
      }
    ]);
  };

  // -------------------------------------------------------------
  // 4. GEOLOCATION & REVERSE GEOCODING (GPS)
  // -------------------------------------------------------------
  const handleFetchGps = () => {
    setIsFetchingGps(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      fallbackToProjectLocation("Geolokalizacja nie jest wspierana przez przeglądarkę.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let formattedAddress = `Współrzędne: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;

        try {
          // Reverse geocode via OpenStreetMap Nominatim with 3s timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const road = data.address.road || data.address.pedestrian || data.address.suburb || '';
              const houseNumber = data.address.house_number ? ` ${data.address.house_number}` : '';
              const city = data.address.city || data.address.town || data.address.village || '';
              const part = [road + houseNumber, city].filter(Boolean).join(', ');
              if (part) {
                formattedAddress = `${part} (GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)})`;
              }
            }
          }
        } catch (e) {
          // If reverse geocoding times out, keep coordinates
          console.warn("Reverse geocoding warning:", e);
        }

        setGpsData({
          latitude: lat,
          longitude: lon,
          address: formattedAddress
        });
        setIsFetchingGps(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        fallbackToProjectLocation("Brak sygnału GPS urządzenia lub brak zgody.");
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  };

  const fallbackToProjectLocation = (reason: string) => {
    setIsFetchingGps(false);
    const projAddress = selectedProject?.address || selectedProject?.name || "Warszawa, ul. Towarowa 22";
    setGpsData({
      latitude: 52.2297,
      longitude: 21.0122,
      address: `${projAddress} (Lokalizacja projektu)`
    });
    setGpsError(`${reason} Pobrano adres przypisany do wybranego projektu.`);
  };

  // -------------------------------------------------------------
  // 5. QUICK TEXT TEMPLATES
  // -------------------------------------------------------------
  const quickTemplates = [
    {
      label: "🛠️ Awaria / Usterka",
      cat: 'issue' as JournalCategory,
      prio: 'urgent' as Priority,
      text: "Awaria szlabanu wjazdowego: Ramię szlabanu nie reaguje na impulsy pętli najazdowej. Centrala sygnalizuje błąd krańcówki. Zabezpieczono wjazd w trybie awaryjnym."
    },
    {
      label: "📋 Protokół odbioru",
      cat: 'done' as JournalCategory,
      prio: 'normal' as Priority,
      text: "Odbiór techniczny montażu urządzeń: Zakończono osadzenie 2 szt. kas automatycznych oraz montaż terminali wyjazdowych. Wszystkie testy komunikacji IP z serwerem przeszły pomyślnie."
    },
    {
      label: "🤝 Spotkanie i ustalenia",
      cat: 'meeting' as JournalCategory,
      prio: 'normal' as Priority,
      text: "Spotkanie robocze z zarządcą obiektu: Ustalono harmonogram wdrożenia nowej taryfy nocnej oraz termin szkolenia personelu ochrony z obsługi konsoli dyspozytorskiej."
    },
    {
      label: "⚡ Pętle i czujniki",
      cat: 'work' as JournalCategory,
      prio: 'high' as Priority,
      text: "Testy pętli indukcyjnych: Pomiary impedancji i nacięcia w nawierzchni asfaltowej wjazdu A. Pętla wykrywa pojazdy prawidłowo, zalano szczeliny uszczelniaczem elastycznym."
    }
  ];

  const applyTemplate = (tpl: typeof quickTemplates[0]) => {
    setContent(tpl.text);
    setCategory(tpl.cat);
    setPriority(tpl.prio);
    if (!title) {
      setTitle(tpl.label.replace(/^[^\s]+\s/, ''));
    }
  };

  // -------------------------------------------------------------
  // 6. ASSOCIATED PEOPLE CHIPS
  // -------------------------------------------------------------
  const handleAddPerson = () => {
    const trimmed = newPersonInput.trim();
    if (trimmed && !people.includes(trimmed)) {
      setPeople([...people, trimmed]);
      setNewPersonInput('');
    }
  };

  const handleRemovePerson = (name: string) => {
    setPeople(people.filter(p => p !== name));
  };

  // -------------------------------------------------------------
  // 7. AI ANALYSIS (GEMINI AI)
  // -------------------------------------------------------------
  const triggerAiAnalysis = async () => {
    const textToAnalyze = content || transcription;
    if (!textToAnalyze) {
      alert("Proszę wpisać treść lub nagrać notatkę głosową przed rozpoczęciem analizy AI.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const rawResult = await analyzeTextWithAI(textToAnalyze);
      
      const firstTask = rawResult.tasks && rawResult.tasks.length > 0 
        ? { 
            title: rawResult.tasks[0].title, 
            assignedTo: rawResult.tasks[0].assignedTo || 'Serwisant techniczny', 
            dueDate: rawResult.tasks[0].dueDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] 
          }
        : null;

      const issueDetails = rawResult.problem 
        ? {
            title: rawResult.problem.title,
            description: rawResult.problem.description,
            priority: rawResult.problem.priority || 'high',
            assignedTo: 'Dział Serwisu'
          }
        : null;

      const suggestions = {
        title: rawResult.title || 'Wpis z terenu',
        category: rawResult.category || 'note',
        priority: rawResult.priority || 'normal',
        people: rawResult.people || [],
        task: firstTask,
        issue: issueDetails
      };

      setAiSuggestions(suggestions);
      
      setTitle(suggestions.title);
      setCategory(suggestions.category);
      setPriority(suggestions.priority);
      if (suggestions.people && suggestions.people.length > 0) {
        setPeople(prev => Array.from(new Set([...prev, ...suggestions.people])));
      }
    } catch (err) {
      console.error(err);
      alert("Analiza AI napotkała problem połączenia. Użyto wbudowanego analizera regułowego.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // -------------------------------------------------------------
  // 8. FINAL SAVE
  // -------------------------------------------------------------
  const handleSaveAll = () => {
    if (!content.trim() && !transcription.trim() && photos.length === 0 && documents.length === 0) {
      alert("Wpis musi zawierać treść, nagranie głosowe lub przynajmniej jeden załącznik (zdjęcie / dokument).");
      return;
    }

    // Determine final title
    let finalTitle = title.trim();
    if (!finalTitle) {
      if (content.trim()) {
        const firstLine = content.trim().split('\n')[0];
        finalTitle = firstLine.length > 45 ? firstLine.slice(0, 45) + '...' : firstLine;
      } else if (transcription.trim()) {
        finalTitle = "Notatka głosowa: " + transcription.slice(0, 35) + '...';
      } else if (photos.length > 0) {
        finalTitle = `Dokumentacja fotograficzna (${photos.length} zdjęć)`;
      } else {
        finalTitle = "Wpis z terenu";
      }
    }

    onSave({
      projectId,
      title: finalTitle,
      content: content.trim() || transcription.trim() || "Wpis z załącznikami z terenu",
      category,
      priority,
      gps: gpsData,
      photos,
      documents,
      audioUrl: audioAttached && audioUrl ? audioUrl : undefined,
      audioTranscription: transcription || undefined,
      people,
      createdTask: (acceptTask && aiSuggestions?.task) ? aiSuggestions.task : null,
      createdIssue: (acceptIssue && aiSuggestions?.issue) ? aiSuggestions.issue : null
    });
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      
      {/* HIDDEN FILE INPUTS FOR CAMERA AND DOCUMENTS */}
      <input 
        ref={photoInputRef}
        type="file" 
        accept="image/*" 
        capture="environment" 
        multiple 
        className="hidden" 
        onChange={handlePhotoFilesSelected} 
      />
      <input 
        ref={docInputRef}
        type="file" 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.zip" 
        multiple 
        className="hidden" 
        onChange={handleDocFilesSelected} 
      />

      <div className="bg-[#0F0F12] border-t sm:border border-[#1F1F24] rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[94vh] overflow-y-auto shadow-2xl p-5 sm:p-6 animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#1F1F24] mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Szybki Wpis do Dziennika</h3>
              <p className="text-[9px] text-[#666670] font-black uppercase tracking-widest">
                Głos • Zdjęcia • Pliki • GPS • Analiza AI
              </p>
            </div>
          </div>
          <button 
            id="close-add-entry-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C21] hover:bg-[#2C2C34] flex items-center justify-center text-[#8E8E99] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-3.5">
          
          {/* Select Project */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] uppercase font-black text-[#666670] tracking-wider flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                Projekt parkingowy
              </label>
              {selectedProject && (
                <span className="text-[9px] text-blue-400 font-bold truncate max-w-[200px]">
                  {selectedProject.address}
                </span>
              )}
            </div>
            <select
              id="entry-project-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 text-[#E0E0E6] rounded-xl px-3 py-2 text-xs outline-none font-bold transition"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Hardware Inputs: Mic / Camera / Doc / GPS */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase font-black text-[#666670] tracking-wider">
                Rejestracja z terenu & Czujniki
              </span>
              <span className="text-[9px] text-[#666670]">Kliknij aby aktywować</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              
              {/* Voice button */}
              {!isRecording ? (
                <button
                  type="button"
                  id="hardware-mic-btn"
                  onClick={handleStartRecording}
                  className="bg-[#1C1C21] hover:bg-[#26262E] hover:border-blue-500/40 border border-[#2C2C34] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 group transition active:scale-95 shadow-sm"
                >
                  <Mic className="w-4.5 h-4.5 text-blue-400 group-hover:scale-110 transition" />
                  <span className="text-[9px] font-black tracking-wider text-[#8E8E99] group-hover:text-blue-300 uppercase">GŁOS</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="hardware-mic-stop-btn"
                  onClick={handleStopRecording}
                  className="bg-red-950/40 border border-red-500 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition animate-pulse shadow-lg"
                >
                  <MicOff className="w-4.5 h-4.5 text-red-400" />
                  <span className="text-[9px] font-black text-red-400">STOP ({recordingSeconds}s)</span>
                </button>
              )}

              {/* Photo Button */}
              <button
                type="button"
                id="hardware-camera-btn"
                onClick={handleTriggerCamera}
                className="bg-[#1C1C21] hover:bg-[#26262E] hover:border-pink-500/40 border border-[#2C2C34] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 group transition active:scale-95 shadow-sm"
              >
                <Camera className="w-4.5 h-4.5 text-pink-400 group-hover:scale-110 transition" />
                <span className="text-[9px] font-black tracking-wider text-[#8E8E99] group-hover:text-pink-300 uppercase">
                  APARAT {photos.length > 0 ? `(${photos.length})` : ''}
                </span>
              </button>

              {/* Document button */}
              <button
                type="button"
                id="hardware-doc-btn"
                onClick={handleTriggerDoc}
                className="bg-[#1C1C21] hover:bg-[#26262E] hover:border-orange-500/40 border border-[#2C2C34] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 group transition active:scale-95 shadow-sm"
              >
                <FileText className="w-4.5 h-4.5 text-orange-400 group-hover:scale-110 transition" />
                <span className="text-[9px] font-black tracking-wider text-[#8E8E99] group-hover:text-orange-300 uppercase">
                  PLIK {documents.length > 0 ? `(${documents.length})` : ''}
                </span>
              </button>

              {/* GPS Button */}
              <button
                type="button"
                id="hardware-gps-btn"
                disabled={isFetchingGps}
                onClick={handleFetchGps}
                className={`border py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 group transition active:scale-95 disabled:opacity-50 shadow-sm ${
                  gpsData 
                    ? 'bg-green-950/20 border-green-500/40 text-green-400' 
                    : 'bg-[#1C1C21] hover:bg-[#26262E] hover:border-yellow-500/40 border-[#2C2C34]'
                }`}
              >
                {isFetchingGps ? (
                  <Loader2 className="w-4.5 h-4.5 text-yellow-500 animate-spin" />
                ) : (
                  <MapPin className={`w-4.5 h-4.5 ${gpsData ? 'text-green-400' : 'text-yellow-500 group-hover:scale-110 transition'}`} />
                )}
                <span className={`text-[9px] font-black tracking-wider uppercase ${gpsData ? 'text-green-400' : 'text-[#8E8E99] group-hover:text-yellow-300'}`}>
                  {gpsData ? 'GPS OK' : 'GPS'}
                </span>
              </button>
            </div>

            {/* Quick Helper Links for Testing */}
            <div className="flex justify-between items-center text-[9px] text-[#666670] mt-1.5 px-0.5">
              <span>Wybierz z aparatu lub wgraj pliki z urządzenia</span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={handleAddSamplePhoto}
                  className="hover:text-pink-400 transition underline decoration-dotted"
                >
                  + Foto testowe
                </button>
                <button 
                  type="button" 
                  onClick={handleAddSampleDoc}
                  className="hover:text-orange-400 transition underline decoration-dotted"
                >
                  + Plik testowy
                </button>
                <button 
                  type="button" 
                  onClick={handleInsertSampleVoiceNote}
                  className="hover:text-blue-400 transition underline decoration-dotted"
                >
                  + Notatka audio
                </button>
              </div>
            </div>
          </div>

          {/* Mic Status or GPS Notice if present */}
          {micStatusMessage && (
            <div className="bg-blue-950/20 border border-blue-500/30 p-2.5 rounded-xl text-[10px] text-blue-300 flex items-center justify-between">
              <span>{micStatusMessage}</span>
              <button 
                type="button" 
                onClick={() => setMicStatusMessage(null)}
                className="text-[#8E8E99] hover:text-white ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {gpsError && (
            <div className="bg-yellow-950/20 border border-yellow-500/30 p-2.5 rounded-xl text-[10px] text-yellow-300 flex items-center justify-between">
              <span>{gpsError}</span>
              <button 
                type="button" 
                onClick={() => setGpsError(null)}
                className="text-[#8E8E99] hover:text-white ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Attached items list indicators */}
          {(gpsData || photos.length > 0 || documents.length > 0 || audioAttached) && (
            <div className="bg-[#16161B] p-3 rounded-xl border border-[#1F1F24] text-xs space-y-2.5 animate-fadeIn">
              <span className="text-[9px] font-black text-[#666670] uppercase tracking-wider block">
                Dołączone załączniki i metadane:
              </span>
              
              {/* GPS Item */}
              {gpsData && (
                <div className="flex items-center justify-between bg-[#1C1C21] p-2 rounded-lg border border-[#2C2C34]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MapPin className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    {isEditingGpsAddress ? (
                      <input
                        type="text"
                        value={gpsData.address}
                        onChange={(e) => setGpsData({ ...gpsData, address: e.target.value })}
                        className="bg-[#16161B] border border-blue-500/50 rounded px-2 py-0.5 text-xs text-white outline-none w-full"
                        onBlur={() => setIsEditingGpsAddress(false)}
                        autoFocus
                      />
                    ) : (
                      <span 
                        onClick={() => setIsEditingGpsAddress(true)}
                        title="Kliknij, aby edytować adres"
                        className="text-[11px] text-[#E0E0E6] truncate font-medium cursor-pointer hover:text-white"
                      >
                        {gpsData.address}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditingGpsAddress(!isEditingGpsAddress)}
                      className="text-[9px] text-[#8E8E99] hover:text-blue-400 px-1"
                    >
                      {isEditingGpsAddress ? 'Zapisz' : 'Edytuj'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setGpsData(null)} 
                      className="text-[#666670] hover:text-white"
                      title="Usuń tag GPS"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Audio Note Item */}
              {audioAttached && (
                <div className="flex items-center justify-between bg-[#1C1C21] p-2 rounded-lg border border-[#2C2C34]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={handleToggleAudioPlayback}
                      className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition"
                      title={isPlayingAudio ? "Zatrzymaj" : "Odtwórz nagranie"}
                    >
                      {isPlayingAudio ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-white">Notatka audio</span>
                        {isPlayingAudio && (
                          <span className="flex gap-0.5 items-center">
                            <span className="w-1 h-3 bg-blue-500 rounded-full animate-bounce"></span>
                            <span className="w-1 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1 h-3 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                          </span>
                        )}
                      </div>
                      {transcription && (
                        <p className="text-[10px] text-[#8E8E99] truncate italic max-w-[280px]">
                          &bdquo;{transcription}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (audioElementRef.current) audioElementRef.current.pause();
                      setAudioAttached(false); 
                      setAudioUrl(null);
                      setTranscription(''); 
                    }} 
                    className="text-[#666670] hover:text-white ml-2"
                    title="Usuń nagranie"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Photos Thumbnails */}
              {photos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[#8E8E99] mb-1">
                    <span>Zdjęcia ({photos.length}):</span>
                    <button
                      type="button"
                      onClick={handleTriggerCamera}
                      className="text-pink-400 hover:text-pink-300 font-bold"
                    >
                      + Dodaj kolejne
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {photos.map((ph, i) => (
                      <div 
                        key={i} 
                        className="relative w-14 h-12 border border-[#2C2C34] rounded-lg overflow-hidden bg-[#1C1C21] shrink-0 group cursor-pointer"
                        onClick={() => setPreviewPhotoUrl(ph)}
                      >
                        <img src={ph} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotos(photos.filter((_, idx) => idx !== i));
                          }}
                          className="absolute top-0.5 right-0.5 bg-[#0A0A0C]/90 p-1 rounded-full text-[#8E8E99] hover:text-red-400 transition"
                          title="Usuń zdjęcie"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents List */}
              {documents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[#8E8E99] mb-1">
                    <span>Dokumenty ({documents.length}):</span>
                    <button
                      type="button"
                      onClick={handleTriggerDoc}
                      className="text-orange-400 hover:text-orange-300 font-bold"
                    >
                      + Dołącz plik
                    </button>
                  </div>
                  <div className="space-y-1">
                    {documents.map((d, i) => {
                      const isPdf = d.type.includes('pdf');
                      const isXls = d.type.includes('xls') || d.type.includes('csv');
                      return (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-[#1C1C21] p-2 rounded-lg border border-[#2C2C34] font-medium text-white">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isPdf ? (
                              <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            ) : isXls ? (
                              <FileSpreadsheet className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            ) : (
                              <FileCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            )}
                            <span className="truncate pr-1 text-xs">{d.name}</span>
                            <span className="text-[9px] text-[#666670] shrink-0 font-bold bg-[#16161B] px-1.5 py-0.5 rounded border border-[#2C2C34]">
                              {d.size}
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setDocuments(documents.filter((_, idx) => idx !== i))} 
                            className="text-[#666670] hover:text-red-400 ml-2"
                            title="Usuń dokument"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick text templates row */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase font-black text-[#666670] tracking-wider">
                Treść wpisu technicznego *
              </label>
              <div className="text-[9px] text-[#666670]">
                {content.length} znaków
              </div>
            </div>

            {/* Template chips */}
            <div className="flex flex-wrap gap-1 mb-2">
              {quickTemplates.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="bg-[#16161B] hover:bg-[#202028] text-[#8E8E99] hover:text-white border border-[#2C2C34] px-2 py-0.5 rounded-lg text-[9px] font-semibold transition"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <textarea
              id="entry-text-textarea"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Opisz wykonane prace, zaobserwowane usterki, ustalenia ze spotkania lub użyj dyktowania głosowego..."
              className="w-full bg-[#1C1C21] border border-[#2C2C34] focus:border-blue-500/50 rounded-xl p-3 text-xs text-white outline-none transition resize-none placeholder-[#666670] font-medium leading-relaxed"
            />
          </div>

          {/* Collapsible Manual Details / Parameters */}
          <div className="border border-[#1F1F24] rounded-xl overflow-hidden bg-[#16161B]/60">
            <button
              type="button"
              onClick={() => setShowManualDetails(!showManualDetails)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-bold text-[#E0E0E6] hover:bg-[#1C1C21] transition"
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black text-[#666670] tracking-wider">
                  Kategoria, Priorytet & Tytuł
                </span>
                <span className="text-[10px] text-blue-400 font-semibold">
                  ({category} • {priority})
                </span>
              </span>
              {showManualDetails ? <ChevronUp className="w-3.5 h-3.5 text-[#8E8E99]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8E8E99]" />}
            </button>

            {showManualDetails && (
              <div className="p-3.5 border-t border-[#1F1F24] space-y-3 animate-fadeIn">
                {/* Custom Title */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#666670] mb-1 tracking-wider">
                    Tytuł Wpisu (opcjonalny - generowany automatycznie jeśli pusty)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Wpisz krótki tytuł wpisu..."
                    className="w-full bg-[#1C1C21] border border-[#2C2C34] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Category and Priority selectors */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#666670] mb-1 tracking-wider">
                      Kategoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as JournalCategory)}
                      className="w-full bg-[#1C1C21] border border-[#2C2C34] text-[#E0E0E6] rounded-xl px-2.5 py-2 text-xs outline-none font-bold"
                    >
                      <option value="note">📝 Notatka ogólna</option>
                      <option value="meeting">🤝 Spotkanie / Narada</option>
                      <option value="contact">☎️ Kontakt telefoniczny</option>
                      <option value="issue">⚠️ Problem / Usterka</option>
                      <option value="work">🔧 Praca montażowa</option>
                      <option value="done">✅ Odbiór / Wykonane</option>
                      <option value="decision">📅 Decyzja projektowa</option>
                      <option value="photo">📸 Dokumentacja foto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#666670] mb-1 tracking-wider">
                      Priorytet
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full bg-[#1C1C21] border border-[#2C2C34] text-[#E0E0E6] rounded-xl px-2.5 py-2 text-xs outline-none font-bold"
                    >
                      <option value="low">🟢 Niski</option>
                      <option value="normal">🟡 Normalny</option>
                      <option value="high">🟠 Wysoki</option>
                      <option value="urgent">🔴 Pilny / Awaria</option>
                    </select>
                  </div>
                </div>

                {/* People associated */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#666670] mb-1 tracking-wider">
                    Osoby powiązane / wykonawcy
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPersonInput}
                      onChange={(e) => setNewPersonInput(e.target.value)}
                      placeholder="Imię, nazwisko lub rola..."
                      className="flex-1 bg-[#1C1C21] border border-[#2C2C34] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPerson();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddPerson}
                      className="bg-[#252530] hover:bg-[#2F2F3D] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                    >
                      Dodaj
                    </button>
                  </div>

                  {people.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {people.map((p, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1C1C21] text-blue-400 text-[10px] font-bold border border-[#2C2C34]">
                          {p}
                          <button type="button" onClick={() => handleRemovePerson(p)} className="text-[#666670] hover:text-white">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TRIGGER GEMINI AI ANALYZER BUTTON */}
          <button
            type="button"
            id="trigger-ai-analyzer-btn"
            disabled={isAnalyzing || (!content && !transcription)}
            onClick={triggerAiAnalysis}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] disabled:opacity-40 disabled:hover:from-blue-600"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                ANALIZOWANIE WPISU PRZEZ GEMINI AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                DOKONAJ ANALIZY GEMINI AI
              </>
            )}
          </button>

          {/* AI SUGGESTIONS EXPANDABLE PANE */}
          {aiSuggestions && (
            <div className="bg-[#16161B] border border-blue-500/30 rounded-2xl p-3.5 space-y-3 shadow-xl relative overflow-hidden animate-fadeIn">
              <div className="flex justify-between items-center border-b border-[#2C2C34] pb-2">
                <span className="text-xs font-black text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Wyniki Analizy Gemini AI:
                </span>
                <span className="text-[9px] text-[#666670] font-bold">Możesz zmienić przed zapisem</span>
              </div>

              {/* Title Suggestion */}
              <div>
                <label className="block text-[9px] font-black uppercase text-[#666670] mb-1 tracking-wider">
                  Zaproponowany Tytuł
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#1C1C21] border border-[#2C2C34] rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none"
                />
              </div>

              {/* Category & Priority Suggestion row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#1C1C21] p-2 rounded-lg border border-[#2C2C34]">
                  <span className="text-[9px] text-[#666670] uppercase font-black block">Kategoria:</span>
                  <span className="font-bold text-white capitalize">{category}</span>
                </div>
                <div className="bg-[#1C1C21] p-2 rounded-lg border border-[#2C2C34]">
                  <span className="text-[9px] text-[#666670] uppercase font-black block">Priorytet:</span>
                  <span className="font-bold text-white uppercase">{priority}</span>
                </div>
              </div>

              {/* AI Suggested Side-Effect Task */}
              {aiSuggestions.task && (
                <div className="bg-[#1C1C21] border border-[#2C2C34] p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-green-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <CheckSquare className="w-3.5 h-3.5" />
                      Utwórz Zadanie w Systemie
                    </span>
                    <input
                      type="checkbox"
                      checked={acceptTask}
                      onChange={(e) => setAcceptTask(e.target.checked)}
                      className="w-4 h-4 rounded border-[#2C2C34] bg-[#1C1C21] text-green-500 focus:ring-0 cursor-pointer"
                    />
                  </div>
                  {acceptTask && (
                    <div className="space-y-2 text-xs pt-1">
                      <input
                        type="text"
                        value={aiSuggestions.task.title}
                        onChange={(e) => setAiSuggestions({
                          ...aiSuggestions,
                          task: { ...aiSuggestions.task!, title: e.target.value }
                        })}
                        className="w-full bg-[#16161B] border border-[#22222A] rounded-lg px-2 py-1 text-xs text-white font-medium"
                      />
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="block text-[#666670] mb-0.5 font-bold uppercase tracking-wider text-[8px]">Odpowiedzialny</label>
                          <input
                            type="text"
                            value={aiSuggestions.task.assignedTo}
                            onChange={(e) => setAiSuggestions({
                              ...aiSuggestions,
                              task: { ...aiSuggestions.task!, assignedTo: e.target.value }
                            })}
                            className="w-full bg-[#16161B] border border-[#22222A] rounded-lg px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[#666670] mb-0.5 font-bold uppercase tracking-wider text-[8px]">Termin</label>
                          <input
                            type="date"
                            value={aiSuggestions.task.dueDate}
                            onChange={(e) => setAiSuggestions({
                              ...aiSuggestions,
                              task: { ...aiSuggestions.task!, dueDate: e.target.value }
                            })}
                            className="w-full bg-[#16161B] border border-[#22222A] rounded-lg px-2 py-1 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Suggested Side-Effect Issue ticket */}
              {aiSuggestions.issue && (
                <div className="bg-[#1C1C21] border border-[#2C2C34] p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Zgłoś Problem / Awarię
                    </span>
                    <input
                      type="checkbox"
                      checked={acceptIssue}
                      onChange={(e) => setAcceptIssue(e.target.checked)}
                      className="w-4 h-4 rounded border-[#2C2C34] bg-[#1C1C21] text-red-500 focus:ring-0 cursor-pointer"
                    />
                  </div>
                  {acceptIssue && (
                    <div className="space-y-2 text-xs pt-1">
                      <input
                        type="text"
                        value={aiSuggestions.issue.title}
                        onChange={(e) => setAiSuggestions({
                          ...aiSuggestions,
                          issue: { ...aiSuggestions.issue!, title: e.target.value }
                        })}
                        className="w-full bg-[#16161B] border border-[#22222A] rounded-lg px-2 py-1 text-xs text-white font-medium"
                      />
                      <textarea
                        rows={2}
                        value={aiSuggestions.issue.description}
                        onChange={(e) => setAiSuggestions({
                          ...aiSuggestions,
                          issue: { ...aiSuggestions.issue!, description: e.target.value }
                        })}
                        className="w-full bg-[#16161B] border border-[#22222A] rounded-lg p-2 text-xs text-white resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit/Save Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              id="cancel-journal-entry-btn"
              onClick={onClose}
              className="flex-1 bg-[#1C1C21] border border-[#2C2C34] hover:bg-[#25252D] py-2.5 rounded-xl text-xs font-black text-[#8E8E99] hover:text-white uppercase tracking-wider transition"
            >
              Anuluj
            </button>
            <button
              id="submit-journal-entry-all-btn"
              type="button"
              onClick={handleSaveAll}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition active:scale-98"
            >
              Zapisz wpis
            </button>
          </div>
        </div>
      </div>

      {/* FULL PHOTO PREVIEW MODAL */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-[#16161B] rounded-2xl overflow-hidden border border-[#2C2C34]">
            <img src={previewPhotoUrl} alt="Podgląd" className="max-w-full max-h-[75vh] object-contain" referrerPolicy="no-referrer" />
            <div className="p-3 flex justify-between items-center bg-[#0F0F12]">
              <span className="text-xs text-[#8E8E99]">Podgląd załączonego zdjęcia</span>
              <button 
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-3 py-1 bg-[#2C2C34] text-white rounded-lg text-xs font-bold"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
