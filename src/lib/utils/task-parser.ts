/**
 * Task Parser Utility
 * Parses AI responses into structured task objects
 */

export interface ParsedTask {
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  priority?: 'high' | 'medium' | 'low';
  estimatedDuration?: number; // in minutes
  syncToCalendar?: boolean; // For calendar integration
}

/**
 * Parse natural language AI response into structured tasks
 * 
 * Example inputs:
 * - "Work on AI feature for 2 hours at 10am"
 * - "• Go to the gym at 6pm (high priority)"
 * - "1. Read for 30 minutes before bed"
 */
export function parseTasksFromAIResponse(response: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  const lines = response.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip headers, explanations, or very short lines
    if (
      trimmed.length < 5 ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('Here') ||
      trimmed.startsWith('I\'ve') ||
      trimmed.startsWith('Based on')
    ) {
      continue;
    }

    // Check if line looks like a task (starts with bullet, number, or dash)
    const taskMatch = trimmed.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
    const taskText = taskMatch ? taskMatch[1] : trimmed;

    // Skip if it's too long (likely a paragraph)
    if (taskText.length > 200) continue;

    const task = parseTaskText(taskText);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Parse individual task text into structured task
 */
function parseTaskText(text: string): ParsedTask | null {
  if (!text || text.length < 3) return null;

  const task: ParsedTask = {
    title: text,
    priority: 'medium',
  };

  // Extract priority
  const priorityMatch = text.match(/\((high|medium|low)\s*priority\)/i);
  if (priorityMatch) {
    task.priority = priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low';
    task.title = text.replace(priorityMatch[0], '').trim();
  }

  // Extract time (e.g., "at 10am", "at 14:00")
  const timeMatch = task.title.match(/\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (timeMatch) {
    task.startTime = normalizeTime(timeMatch[1]);
    task.title = task.title.replace(timeMatch[0], '').trim();
  }

  // Extract duration (e.g., "for 2 hours", "for 30 minutes")
  const durationMatch = task.title.match(/\s+for\s+(\d+)\s*(hour|minute)s?/i);
  if (durationMatch) {
    const amount = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    task.estimatedDuration = unit === 'hour' ? amount * 60 : amount;
    task.title = task.title.replace(durationMatch[0], '').trim();
    
    // Calculate end time if start time exists
    if (task.startTime && task.estimatedDuration) {
      task.endTime = calculateEndTime(task.startTime, task.estimatedDuration);
    }
  }

  // Clean up title
  task.title = task.title
    .replace(/^[-*•]\s*/, '') // Remove bullets
    .replace(/^\d+\.\s*/, '') // Remove numbers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Validate title
  if (!task.title || task.title.length < 3) return null;

  return task;
}

/**
 * Normalize time string to HH:MM format
 */
function normalizeTime(timeStr: string): string {
  const cleaned = timeStr.trim().toLowerCase();
  
  // Handle "10am", "2pm" format
  const ampmMatch = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = ampmMatch[2] || '00';
    const period = ampmMatch[3];
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  // Handle "14:30" format
  const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  return cleaned;
}

/**
 * Calculate end time given start time and duration in minutes
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Validate parsed task
 */
export function validateTask(task: ParsedTask): boolean {
  if (!task.title || task.title.length < 3) return false;
  if (task.title.length > 200) return false;
  
  // Validate time format if present
  if (task.startTime && !/^\d{2}:\d{2}$/.test(task.startTime)) return false;
  if (task.endTime && !/^\d{2}:\d{2}$/.test(task.endTime)) return false;
  
  return true;
}

/**
 * Check if parsed tasks are confident enough to skip LLM refinement
 * 
 * Confident if:
 * - At least one task found
 * - All tasks have valid titles
 * - At least 50% have time or priority info
 */
export function isConfidentParse(tasks: ParsedTask[]): boolean {
  if (tasks.length === 0) return false;
  
  // Check if all tasks are valid
  const allValid = tasks.every(validateTask);
  if (!allValid) return false;
  
  // Count tasks with detailed information (time, priority, or duration)
  const hasDetails = tasks.filter(t => 
    t.startTime || 
    (t.priority && t.priority !== 'medium') || 
    t.estimatedDuration
  );
  
  // Confident if at least 50% have details
  return (hasDetails.length / tasks.length) >= 0.5;
}

