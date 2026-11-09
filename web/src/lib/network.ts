// Qui travaille avec qui : deux membres nommés dans un même projet. [{ a, b, projects }], a < b, les plus fournies d'abord.
export function collaborations(participations: [string, string, ...unknown[]][], isMember: (id: string) => boolean) {
  const byProject = new Map<string, Set<string>>(), pairs = new Map<string, { a: string; b: string; projects: string[] }>();
  for (const [project, org] of participations) {
    if (!isMember(org)) continue;
    if (!byProject.has(project)) byProject.set(project, new Set());
    byProject.get(project)!.add(org);
  }
  for (const [project, orgs] of byProject) {
    const l = [...orgs].sort();
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const k = `${l[i]}\u0000${l[j]}`;
      if (!pairs.has(k)) pairs.set(k, { a: l[i], b: l[j], projects: [] });
      pairs.get(k)!.projects.push(project);
    }
  }
  return [...pairs.values()].sort((x, y) => y.projects.length - x.projects.length);
}
