import { getActiveOrganizationId } from "../../../shared/data/tenant-scope";
import { CacheAside } from "../../../platform/redis/cache-aside";
import { DomainEvents, ClientEventType } from "../../../platform/redis/domain-events";
import { clientCache, clientEvents } from "../../../platform/redis/redis-runtime";
import { ClientRepository, ListClientsRepositoryResult } from "./client.repository";
import { CreateClientRequestDto, UpdateClientRequestDto } from "../dtos/client.dto";

const scopeFor = (userId: number): string => {
  const organizationId = getActiveOrganizationId();
  return organizationId ? `org:${organizationId}` : `user:${userId}`;
};
const validList = (value: unknown): value is ListClientsRepositoryResult => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ListClientsRepositoryResult>;
  return Number.isSafeInteger(candidate.totalItems) && Number(candidate.totalItems) >= 0 && Array.isArray(candidate.clients) &&
    candidate.clients.every(client => Number.isSafeInteger(client?.id) && typeof client?.name === "string");
};
export class CachedClientRepository implements ClientRepository {
  constructor(private readonly source: ClientRepository, private readonly cache: CacheAside = clientCache,
    private readonly events: DomainEvents = clientEvents) {}
  public findById(userId: number, id: number) { return this.source.findById(userId, id); }
  public list(userId: number, query: Parameters<ClientRepository["list"]>[1]) {
    return this.cache.read(scopeFor(userId), query, () => this.source.list(userId, query), validList);
  }
  public async create(userId: number, input: CreateClientRequestDto) {
    const scope = scopeFor(userId);
    const result = await this.source.create(userId, input);
    await this.changed("client.created", scope, result.id);
    return result;
  }
  public async update(userId: number, id: number, input: UpdateClientRequestDto) {
    const scope = scopeFor(userId);
    const result = await this.source.update(userId, id, input);
    if (result) await this.changed("client.updated", scope, id);
    return result;
  }
  public async delete(userId: number, id: number) {
    const scope = scopeFor(userId);
    const result = await this.source.delete(userId, id);
    if (result) await this.changed("client.deleted", scope, id);
    return result;
  }
  private async changed(type: ClientEventType, scope: string, id: number): Promise<void> {
    await this.cache.invalidate(scope);
    await this.events.publish(type, scope, id);
  }
}
