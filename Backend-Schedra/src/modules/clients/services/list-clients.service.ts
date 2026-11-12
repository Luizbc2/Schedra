import { ClientDto, ListClientsQueryDto } from "../dtos/client.dto";
import { ClientRepository } from "../repositories/client.repository";

type ListClientsResponseDto = {
  data: ClientDto[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

type ListClientsServiceResult = {
  success: true;
  data: ListClientsResponseDto;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 6;

export class ListClientsService {
  constructor(private readonly clientRepository: ClientRepository) {}

  public async execute(userId: number, query: ListClientsQueryDto): Promise<ListClientsServiceResult> {
    const page = this.normalizePositiveNumber(query.page, DEFAULT_PAGE);
    const limit = Math.min(100, this.normalizePositiveNumber(query.limit, DEFAULT_LIMIT));
    const search = (query.search?.trim().toLowerCase() ?? "").slice(0, 120);

    const { clients, totalItems } = await this.clientRepository.list(userId, {
      page,
      limit,
      search
    });

    return {
      success: true,
      data: {
        data: clients,
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit))
      }
    };
  }

  private normalizePositiveNumber(value: number | undefined, fallback: number): number {
    if (!value || !Number.isFinite(value)) {
      return fallback;
    }

    return Math.max(1, Math.trunc(value));
  }
}
