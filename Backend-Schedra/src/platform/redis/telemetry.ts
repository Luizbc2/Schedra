type Category = "cache" | "redis" | "events";
const counters = new Map<string, number>();
export type InfrastructureLog = (record: Record<string, string | number>) => void;
export const infrastructureLog: InfrastructureLog = record => {
  if (process.env.NODE_ENV !== "test") console.log(JSON.stringify(record));
};
export const countInfrastructure = (category: Category, outcome: string): void => {
  const key = `${category}:${outcome}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
};
export const renderInfrastructureMetrics = (): string => [
  "# HELP schedra_infrastructure_operations_total Cache, Redis and event outcomes.",
  "# TYPE schedra_infrastructure_operations_total counter",
  ...[...counters].sort().map(([key, value]) => {
    const [category, outcome] = key.split(":");
    return `schedra_infrastructure_operations_total{category="${category}",outcome="${outcome}"} ${value}`;
  }),
].join("\n") + "\n";
