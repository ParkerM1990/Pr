import { JournalCategory, Priority } from '../types';

export interface AIAnalysisResult {
  category: JournalCategory;
  priority: Priority;
  title: string;
  people: string[];
  tasks: Array<{
    title: string;
    description: string;
    dueDate: string;
    assignedTo: string;
    priority: Priority;
  }>;
  problem: {
    title: string;
    description: string;
    priority: Priority;
  } | null;
}

export const analyzeTextWithAI = async (text: string, currentDate?: string): Promise<AIAnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        currentDate: currentDate || new Date().toISOString().split('T')[0]
      }),
    });

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      // Validate that problem fields are present
      let problem = json.data.problem;
      if (problem && (!problem.title || !problem.description)) {
        problem = null;
      }
      return {
        category: json.data.category || 'note',
        priority: json.data.priority || 'normal',
        title: json.data.title || 'Nowy wpis',
        people: json.data.people || [],
        tasks: json.data.tasks || [],
        problem: problem
      };
    }
    
    throw new Error('Invalid response structure from AI analyst');
  } catch (error) {
    console.error('Error calling /api/analyze:', error);
    throw error;
  }
};
