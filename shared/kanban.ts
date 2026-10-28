/** A task's `project` field holds one or more project names, comma-separated; the first is the main project. */
export const splitProjects = (project: string): string[] =>
  project
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
