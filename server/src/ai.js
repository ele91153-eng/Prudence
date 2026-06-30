import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function askClaude(messages, systemPrompt) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text;
}

export async function generateClarifyingQuestions(goalText) {
  const system = `You are an expert goal coach. A user has entered a goal. Your job is to ask 2-4 targeted clarifying questions to gather the information needed to build an optimal, personalized plan.

Return a JSON object with this structure:
{
  "category": "fitness|test_prep|skill_acquisition|strength|habit|creative|other",
  "questions": [
    { "id": "q1", "question": "...", "placeholder": "..." },
    ...
  ]
}

Make questions specific to the goal type. For fitness/endurance goals ask about current fitness level, available days, injuries. For test prep ask about current scores, weak areas, study hours. For skill goals ask about current level, daily time available. Always ask about preferred time of day for tasks if not obvious.`;

  const text = await askClaude([{ role: 'user', content: `Goal: ${goalText}` }], system);
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
}

export async function generateFullPlan(goal, answers, preferredTimes) {
  const today = new Date().toISOString().split('T')[0];
  const deadline = goal.deadline;
  const daysUntil = Math.ceil((new Date(deadline) - new Date(today)) / (1000 * 60 * 60 * 24));

  const system = `You are an expert goal coach with deep knowledge of evidence-based training and learning principles.

Given a user's goal, their answers to clarifying questions, and a deadline, generate a complete phased plan.

Apply these principles:
- For fitness/endurance: progressive overload, periodization (base/build/peak/taper), max 10% weekly volume increase, at least 1 rest day/week
- For test prep: diagnostic-first prioritization, spaced repetition, increasing full-length simulations, taper in final week
- For skill/language: spaced repetition, daily minimum-viable practice over sporadic long sessions
- Always taper intensity 3-7 days before any high-stakes deadline
- Let the AI decide the optimal number and type of phases based on goal type and timeline

Return a JSON object with this structure:
{
  "phases": [
    {
      "name": "Phase Name",
      "start_day": 1,
      "end_day": 30,
      "description": "What this phase focuses on",
      "daily_duration_minutes": 60,
      "focus": "..."
    }
  ],
  "metrics_to_track": [
    { "name": "metric_name", "unit": "unit", "prompt": "How to ask user to log it" }
  ],
  "overview": "Brief coaching summary of the overall plan"
}`;

  const userContent = `Goal: ${goal.description}
Deadline: ${deadline} (${daysUntil} days from today, ${today})
Category: ${goal.category}
User answers: ${JSON.stringify(answers)}
Preferred task times: ${preferredTimes}`;

  const text = await askClaude([{ role: 'user', content: userContent }], system);
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
}

export async function generateDayTasks(goal, date, dayNumber, phase, completionHistory, preferredTimes) {
  const system = `You are a daily goal coach. Generate today's specific tasks for a user working toward their goal.

Be specific and actionable — like a real coach giving exact instructions. Include exact durations, sets/reps, page numbers, specific exercises, etc.

Return a JSON array of tasks:
[
  {
    "time": "9:00 AM",
    "duration_minutes": 45,
    "title": "Short task title",
    "instruction": "Detailed coaching instruction in an encouraging, specific coach's voice",
    "category": "main|warmup|cooldown|rest|supplemental"
  }
]

Keep it to 1-4 tasks per day. Make tasks specific to the current phase. Account for any recent missed or failed tasks in the completion history.`;

  const userContent = `Goal: ${goal.description}
Today: ${date} (Day ${dayNumber})
Current phase: ${phase.name} — ${phase.description}
Phase focus: ${phase.focus}
Preferred times: ${preferredTimes}
Recent completion history (last 7 days): ${JSON.stringify(completionHistory)}`;

  const text = await askClaude([{ role: 'user', content: userContent }], system);
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
}

export async function regenerateDayTasks(goal, date, dayNumber, phase, originalTasks, reason, preferredTimes) {
  const system = `You are a flexible goal coach. The user needs today's tasks adjusted. Generate alternative tasks that still serve the same phase goal but work better for them today.

Keep it realistic and maintain progress momentum. Don't let one adjustment derail the whole plan.

Return the same JSON format as the original tasks:
[
  {
    "time": "9:00 AM",
    "duration_minutes": 45,
    "title": "Short task title",
    "instruction": "Detailed coaching instruction",
    "category": "main|warmup|cooldown|rest|supplemental"
  }
]`;

  const userContent = `Goal: ${goal.description}
Today: ${date} (Day ${dayNumber})
Current phase: ${phase.name} — ${phase.description}
Original tasks: ${JSON.stringify(originalTasks)}
Reason for regeneration: ${reason}
Preferred times: ${preferredTimes}`;

  const text = await askClaude([{ role: 'user', content: userContent }], system);
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
}
