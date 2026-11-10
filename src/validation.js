const STATUSES = ['To Do', 'In Progress', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// Merges `input` over `base` and returns { value } or { error }.
function buildTask(input, base) {
  const task = { ...base, ...input };

  if (typeof task.title !== 'string' || task.title.trim() === '') {
    return { error: 'title is required' };
  }
  task.title = task.title.trim();
  if (task.title.length > 200) return { error: 'title must be 200 characters or fewer' };

  if (typeof task.description !== 'string') return { error: 'description must be text' };

  if (task.due_date === '') task.due_date = null;
  if (task.due_date !== null && !isValidDate(task.due_date)) {
    return { error: 'due_date must be a date in YYYY-MM-DD format' };
  }
  if (!PRIORITIES.includes(task.priority)) {
    return { error: `priority must be one of: ${PRIORITIES.join(', ')}` };
  }
  if (!STATUSES.includes(task.status)) {
    return { error: `status must be one of: ${STATUSES.join(', ')}` };
  }

  return {
    value: {
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
    },
  };
}

const DEFAULTS = { description: '', due_date: null, priority: 'Medium', status: 'To Do' };

module.exports = { STATUSES, PRIORITIES, DEFAULTS, buildTask };
