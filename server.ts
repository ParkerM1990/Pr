import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Set up Gemini API Client lazily
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. AI API Endpoints
app.post('/api/analyze', async (req, res) => {
  const { text, currentDate } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required' });
  }

  const dateStr = currentDate || '2026-09-05'; // fallback to user current date

  const client = getAiClient();
  if (!client) {
    console.log('Using mock rule-based analyzer (No GEMINI_API_KEY provided)');
    // Fallback: simple rule-based extraction in Polish
    const lower = text.toLowerCase();
    
    let category = 'note';
    if (lower.includes('spotkan') || lower.includes('rozmow')) category = 'meeting';
    if (lower.includes('telefon') || lower.includes('kontakt') || lower.includes('zadzwon')) category = 'contact';
    if (lower.includes('problem') || lower.includes('awari') || lower.includes('uszkodz')) category = 'issue';
    if (lower.includes('ustalil') || lower.includes('decyzj')) category = 'decision';
    if (lower.includes('prac') || lower.includes('serwis') || lower.includes('zamont')) category = 'work';
    if (lower.includes('zdjec') || lower.includes('foto')) category = 'photo';
    if (lower.includes('dokument') || lower.includes('pdf')) category = 'document';

    let priority = 'normal';
    if (lower.includes('piln') || lower.includes('awari') || lower.includes('pożar') || lower.includes('asap')) {
      priority = 'urgent';
    } else if (lower.includes('ważn') || lower.includes('szybk')) {
      priority = 'high';
    }

    const title = text.slice(0, 45) + (text.length > 45 ? '...' : '');

    // Extract people
    const people: string[] = [];
    if (lower.includes('kierownik')) people.push('Kierownik Parkingu');
    if (lower.includes('wykonawc')) people.push('Wykonawca');
    if (lower.includes('serwis')) people.push('Serwis');
    if (lower.includes('dyrektor')) people.push('Dyrektor');

    // Extract tasks
    const tasks: any[] = [];
    if (lower.includes('wycen') || lower.includes('przygotowac') || lower.includes('zrobic')) {
      tasks.push({
        title: 'Przygotować wycenę / realizację',
        description: text,
        dueDate: '2026-09-11', // next Friday
        assignedTo: lower.includes('wykonawc') ? 'Wykonawca' : 'Osoba odpowiedzialna',
        priority: priority
      });
    }

    // Extract problem
    let problem = null;
    if (category === 'issue' || lower.includes('problem') || lower.includes('uszkodz')) {
      problem = {
        title: 'Zgłoszona usterka: ' + text.slice(0, 30) + '...',
        description: text,
        priority: priority
      };
    }

    return res.json({
      success: true,
      mocked: true,
      data: {
        category,
        priority,
        title,
        people,
        tasks,
        problem
      }
    });
  }

  try {
    const prompt = `Analyze this journal entry from a parking project manager and extract key structured information in Polish:
"${text}"

Current date is ${dateStr} (assume year is 2026).
Calculate deadlines relatively:
- "do piątku" is the nearest Friday after ${dateStr}.
- "do końca miesiąca" is the last day of the current month of ${dateStr}.
- "na jutro" is the next day after ${dateStr}.

Extract recommended category, priority, brief title, people, tasks, and problem details strictly matching the schema.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Recommended category: 'note' | 'meeting' | 'contact' | 'issue' | 'work' | 'done' | 'decision' | 'document' | 'photo' | 'info'"
            },
            priority: {
              type: Type.STRING,
              description: "Recommended priority: 'low' | 'normal' | 'high' | 'urgent'"
            },
            title: {
              type: Type.STRING,
              description: "Brief summary/title of the entry in Polish (max 50 characters)"
            },
            people: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of people or roles mentioned in the text (e.g. 'Kierownik Parkingu', 'Wykonawca')"
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Task title in Polish" },
                  description: { type: Type.STRING, description: "Detailed task description in Polish" },
                  dueDate: { type: Type.STRING, description: "YYYY-MM-DD format, computed relative to current date" },
                  assignedTo: { type: Type.STRING, description: "Person or role responsible (e.g., 'Wykonawca', 'Serwisant', or 'Użytkownik')" },
                  priority: { type: Type.STRING, description: "'low' | 'normal' | 'high' | 'urgent'" }
                },
                required: ['title', 'description', 'dueDate', 'assignedTo', 'priority']
              },
              description: "Tasks that should be created based on the text"
            },
            problem: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Problem/Issue title in Polish" },
                description: { type: Type.STRING, description: "Problem/Issue description in Polish" },
                priority: { type: Type.STRING, description: "'low' | 'normal' | 'high' | 'urgent'" }
              },
              description: "Problem details if a problem was mentioned, otherwise empty/null properties."
            }
          },
          required: ['category', 'priority', 'title', 'people', 'tasks']
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Gemini API analysis failed:', error);
    return res.status(500).json({ error: 'Failed to analyze text using AI', details: error.message });
  }
});

// 2. AI Contract PDF Analysis Endpoint
app.post('/api/analyze-contract', async (req, res) => {
  const { pdfBase64, fileName, currentDate } = req.body;
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return res.status(400).json({ error: 'PDF base64 data is required' });
  }

  const dateStr = currentDate || new Date().toISOString().split('T')[0];
  const client = getAiClient();

  if (!client) {
    console.log('Using smart rule-based mock contract analyzer (No GEMINI_API_KEY provided)');
    const lowerName = (fileName || '').toLowerCase();
    
    let name = "Modernizacja Systemu Parkowania";
    let address = "Warszawa, ul. Marszałkowska 100";
    let clientName = "Kaufland Polska Sp. z o.o.";
    let startDate = dateStr;
    let description = "Dostawa, montaż i uruchomienie nowoczesnego systemu parkingowego z systemem kamer LPR do odczytu tablic rejestracyjnych oraz szlabanami.";
    let notes = "Umowa obejmuje dostawę 2 terminali wjazdowych, 2 wyjazdowych i kasy automatycznej. Czas reakcji serwisu SLA: 4h dla awarii krytycznych.";
    let clientContact = "Jan Kowalski (Dział Techniczny Kaufland), tel: +48 601 202 303, e-mail: j.kowalski@kaufland.pl";
    let billingTerms = "Płatność w 3 transzach: 30% zaliczki po podpisaniu umowy, 50% po dostawie urządzeń, 20% po odbiorze końcowym. Termin płatności: 21 dni.";
    let scopeOfWork = "Dostawa urządzeń, montaż pętli indukcyjnych w asfalcie, okablowanie strukturalne, konfiguracja bazy danych LPR, szkolenie personelu obsługi.";

    if (lowerName.includes('gdansk') || lowerName.includes('gdańsk') || lowerName.includes('forum')) {
      name = "Parking Podziemny Forum Gdańsk";
      address = "Gdańsk, ul. Targ Sienny 7";
      clientName = "Forum Gdańsk Sp. z o.o.";
      description = "Zintegrowany system poboru opłat i naprowadzania na wolne miejsca parkingowe dla 1100 pojazdów.";
      notes = "Kary umowne za zwłokę w realizacji: 0.1% wartości kontraktu za każdy dzień zwłoki. Gwarancja: 36 miesięcy.";
      clientContact = "Anna Nowak (Dyrektor Operacyjny), tel: +48 58 700 80 90, e-mail: a.nowak@forumgdansk.pl";
      billingTerms = "Faktura końcowa po podpisaniu bezusterkowego protokołu odbioru. Termin płatności: 30 dni.";
      scopeOfWork = "Dostawa i montaż 6 szlabanów szybkobieżnych, instalacja czujników ultradźwiękowych nad każdym miejscem postojowym, tablice LED zliczające wolne miejsca.";
    } else if (lowerName.includes('krakow') || lowerName.includes('kraków') || lowerName.includes('galeria')) {
      name = "Automatyzacja Parkingu Galeria Krakowska";
      address = "Kraków, ul. Pawia 5";
      clientName = "ECE Projektmanagement Polska";
      description = "Instalacja terminali biletowych nowej generacji i integracja z miejskim systemem informacji parkingowej.";
      notes = "SLA serwisowe: Usunięcie awarii krytycznej w 2 godziny od zgłoszenia. Serwis działa 24/7/365.";
      clientContact = "Marek Wiśniewski (Kierownik ds. Infrastruktury), tel: +48 12 400 50 60, e-mail: m.wisniewski@ece-polska.pl";
      billingTerms = "Miesięczne faktury częściowe na podstawie zaawansowania prac. 10% wartości kontraktu zatrzymane jako kaucja gwarancyjna na okres 12 miesięcy.";
      scopeOfWork = "Demontaż starych kas ręcznych, dostawa i montaż 4 kas automatycznych, integracja oprogramowania parkingowego z systemem biletowym MPK.";
    } else if (lowerName.includes('wroclaw') || lowerName.includes('wrocław') || lowerName.includes('magnolia')) {
      name = "Wymiana Szlabanów i Kas Wrocław Magnolia";
      address = "Wrocław, ul. Legnicka 58";
      clientName = "Multi Poland Sp. z o.o.";
      description = "Dostawa kas automatycznych obsługujących płatności kartą, gotówką oraz BLIK. Wdrożenie systemu rozpoznawania VIP.";
      notes = "Instalacja w godzinach nocnych (22:00 - 06:00) w celu zminimalizowania utrudnień dla klientów galerii.";
      clientContact = "Piotr Wójcik (Dyrektor Galerii), tel: +48 71 300 20 10, e-mail: p.wojcik@multi-poland.pl";
      billingTerms = "Płatność jednorazowa po odbiorze końcowym i uruchomieniu produkcyjnym systemu. Termin płatności: 14 dni.";
      scopeOfWork = "Wymiana 8 szlabanów na szlabany o czasie otwarcia < 1.2s, instalacja kas automatycznych z modułami płatności zbliżeniowych i BLIK, kalibracja pętli wjazdowych.";
    } else if (lowerName.includes('poznan') || lowerName.includes('poznań') || lowerName.includes('posnania')) {
      name = "System Parkingowy Posnania Poznań";
      address = "Poznań, ul. Pleszewska 1";
      clientName = "Apsys Polska S.A.";
      description = "Prace instalacyjne okablowania strukturalnego pod pętle indukcyjne i czujniki zajętości miejsc parkingowych.";
      notes = "Wymagana koordynacja z inspektorem BHP i nadzorem inwestorskim galerii.";
      clientContact = "Krzysztof Kamiński (Inspektor Nadzoru Inwestorskiego), tel: +48 61 800 90 00, e-mail: k.kaminski@apsys.pl";
      billingTerms = "Zaliczka 20% przed rozpoczęciem prac, 60% po zakończeniu okablowania, 20% po odbiorze końcowym. Termin płatności: 30 dni.";
      scopeOfWork = "Ułożenie 1200m kabli sygnałowych, nacięcie nawierzchni asfaltowej pod 12 pętli indukcyjnych, uszczelnienie nacięć żywicą poliuretanową, testy ciągłości.";
    }

    const recurringTasks = [
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

    const endDate = "2031-12-31";
    const equipmentList = "- 2x kasy automatyczne (płatność kartą i bilonem)\n- 4x szlabany szybkobieżne\n- 4x terminale biletowe wjazd/wyjazd\n- 4x kamery LPR do odczytu tablic rejestracyjnych";
    const remunerationAmount = "12 500 PLN netto miesięcznie ryczałtu podstawowego + 1.5% prowizji od przychodów brutto";
    const keyContractPoints = "- Kary umowne za opóźnienie: 500 PLN za każdy dzień zwłoki.\n- Gwarancja techniczna: 36 miesięcy od odbioru końcowego.\n- SLA serwisowe: czas reakcji 4h od zgłoszenia.\n- Zakaz konkurencji w promieniu 1 km od obiektu.";

    return res.json({
      success: true,
      mocked: true,
      data: {
        name,
        address,
        client: clientName,
        startDate,
        endDate,
        description,
        notes,
        clientContact,
        billingTerms,
        scopeOfWork,
        equipmentList,
        remunerationAmount,
        keyContractPoints,
        recurringTasks
      }
    });
  }

  try {
    const prompt = `Przeanalizuj dokładnie dołączony dokument PDF (umowę / kontrakt) i wyekstrahuj dane projektu infrastruktury parkingowej.
Zwróć dane w języku polskim, dopasowując je do poniższego schematu JSON.
Zidentyfikuj w umowie wszelkie powtarzalne obowiązki okresowe lub miesięczne (np. przygotowanie rozliczeń, konserwacje, sprawozdania SLA). Jeśli nie są wprost wymienione, zaproponuj standardowe (np. Przygotowanie rozliczeń każdego 5. dnia miesiąca, Konserwacja techniczna do 20. dnia miesiąca, Raportowanie zajętości do 28. dnia miesiąca).
Dzisiejsza data to ${dateStr}. Jeśli w umowie nie określono jasnej daty rozpoczęcia lub zakończenia, użyj dzisiejszej daty na rozpoczęcie, a zakończenie oznacz jako puste lub 'Bezterminowo'.`;

    // Strip header metadata if present
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: 'application/pdf'
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { 
              type: Type.STRING, 
              description: "Zwięzła, oficjalna nazwa projektu z umowy po polsku (np. System parkingowy Galeria Mokotów)" 
            },
            address: { 
              type: Type.STRING, 
              description: "Dokładny adres lokalizacji lub nazwa miasta inwestycji z umowy" 
            },
            client: { 
              type: Type.STRING, 
              description: "Pełna nazwa inwestora, zamawiającego lub klienta, z którym podpisano umowę" 
            },
            startDate: { 
              type: Type.STRING, 
              description: "Data rozpoczęcia prac lub wejścia umowy w życie w formacie YYYY-MM-DD" 
            },
            endDate: { 
              type: Type.STRING, 
              description: "Data zakończenia obowiązywania umowy w formacie YYYY-MM-DD lub słowo 'Bezterminowo'" 
            },
            description: { 
              type: Type.STRING, 
              description: "Krótkie streszczenie celów i zakresu technicznego prac wymienionych w umowie (max 3 zdania)" 
            },
            notes: { 
              type: Type.STRING, 
              description: "Kluczowe informacje dodatkowe: czas obowiązywania gwarancji, warunki SLA, wysokości kar umownych lub specyfikacja urządzeń" 
            },
            clientContact: { 
              type: Type.STRING, 
              description: "Dane kontaktowe Zamawiającego (druga strona umowy inna niż City Parking Group) - imiona, nazwiska, stanowiska, numery telefonów lub adresy e-mail przedstawicieli lub osób nadzorujących" 
            },
            billingTerms: { 
              type: Type.STRING, 
              description: "Warunki płatności, terminy rozliczeń, podział na transze, zaliczki, warunki fakturowania oraz terminy płatności faktur (np. 30 dni od dostarczenia)" 
            },
            scopeOfWork: { 
              type: Type.STRING, 
              description: "Szczegółowy zakres obowiązków, prac technicznych, budowlanych, instalacyjnych nałożonych na wykonawcę wymieniony w umowie" 
            },
            equipmentList: { 
              type: Type.STRING, 
              description: "Spis urządzeń (kasy automatyczne, szlabany, terminale wjazdowe/wyjazdowe, kamery LPR, itp.) zainstalowanych lub planowanych" 
            },
            remunerationAmount: { 
              type: Type.STRING, 
              description: "Kwota i model wynagrodzenia dla City Parking Group (np. miesięczny czynsz dzierżawny, prowizja %, stawki robocze)" 
            },
            keyContractPoints: { 
              type: Type.STRING, 
              description: "Kluczowe postanowienia umowy, istotne kary, terminy szczególne w postaci listy punktowanej od myślników (po polsku)" 
            },
            recurringTasks: {
              type: Type.ARRAY,
              description: "Lista powtarzalnych zadań okresowych/miesięcznych (np. przygotowanie rozliczeń, przeglądy, raporty) wymienionych w umowie lub zalecanych dla tego projektu",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Krótki tytuł zadania po polsku (np. Przygotowanie rozliczeń finansowych)" },
                  description: { type: Type.STRING, description: "Dokładniejszy opis zadania i warunków wykonania po polsku" },
                  dayOfMonth: { type: Type.INTEGER, description: "Sugerowany lub określony dzień miesiąca na realizację (liczba 1-28, np. 5 dla 'do 5. dnia', 28 dla końca miesiąca)" }
                },
                required: ['title', 'description', 'dayOfMonth']
              }
            }
          },
          required: ['name', 'address', 'client', 'startDate', 'endDate', 'description', 'notes', 'clientContact', 'billingTerms', 'scopeOfWork', 'equipmentList', 'remunerationAmount', 'keyContractPoints', 'recurringTasks']
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Gemini contract PDF analysis failed:', error);
    return res.status(500).json({ error: 'Failed to analyze contract PDF using AI', details: error.message });
  }
});

// Serve frontend assets
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in Development mode with Vite middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in Production mode');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupServer();
