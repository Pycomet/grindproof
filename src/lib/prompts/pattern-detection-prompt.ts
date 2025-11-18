export const PATTERN_DETECTION_PROMPT = `
Analyze the supplied activity data and detect behavioral patterns. Return ONLY JSON. Do not include extra text.

Input data expected (examples): list of tasks (id, title, planned_date, completed_date/null, evidence ids), GitHub activity (date, repo, commit_id, files_changed), calendar events, active goals with completion percent, number of new repos started.

Output format & validation rules:

Return a JSON object: {"patterns":[ ... ]}.

Include only patterns with confidence >= 0.5 AND shouldSave: true.

Allowed type values: procrastination, task_skipping, new_project_addiction, goal_abandonment, evidence_avoidance, overcommitment, vague_planning, planning_without_execution.

description must be 50 to 100 characters.

confidence must be a decimal between 0.5 and 1.0.

shouldSave must be true (boolean).

Return ONLY valid JSON.

{
  "patterns": [
    {
      "type": "new_project_addiction",
      "description": "Starts new repos frequently instead of progressing existing projects",
      "confidence": 0.85,
      "shouldSave": true
    }
  ]
}
`;

