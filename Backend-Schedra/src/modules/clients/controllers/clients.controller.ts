import { Request, Response } from "express";

import { ListClientsQueryDto } from "../dtos/client.dto";
import { SequelizeClientRepository } from "../repositories/sequelize-client.repository";
import { CreateClientService } from "../services/create-client.service";
import { DeleteClientService } from "../services/delete-client.service";
import { GetClientService } from "../services/get-client.service";
import { ListClientsService } from "../services/list-clients.service";
import { UpdateClientService } from "../services/update-client.service";
import { getAuthenticatedUserId } from "../../auth/utils/auth-request.util";
import { asNumber, asRequestBody, asString } from "../../../shared/http/request-parser";
import { recordRequestAudit } from "../../../shared/http/request-audit";
import { CachedClientRepository } from "../repositories/cached-client.repository";

const clientRepository = new CachedClientRepository(new SequelizeClientRepository());

export class ClientsController {
  public async getById(request: Request, response: Response): Promise<Response> {
    const getClientService = new GetClientService(clientRepository);
    const authenticatedUserId = getAuthenticatedUserId(request);

    if (!authenticatedUserId) {
      return this.sendFailure(response, 401, "Usuário autenticado é obrigatório.");
    }

    const id = Number(request.params.id);
    const result = await getClientService.execute(authenticatedUserId, id);

    if (!result.success) {
      return this.sendFailure(response, result.statusCode, result.message);
    }

    return response.status(200).json(result.data);
  }

  public async list(request: Request, response: Response): Promise<Response> {
    const listClientsService = new ListClientsService(clientRepository);
    const authenticatedUserId = getAuthenticatedUserId(request);

    if (!authenticatedUserId) {
      return this.sendFailure(response, 401, "Usuário autenticado é obrigatório.");
    }

    const query: ListClientsQueryDto = {
      page: asNumber(request.query.page),
      limit: asNumber(request.query.limit),
      search: asString(request.query.search),
    };

    const result = await listClientsService.execute(authenticatedUserId, query);

    return response.status(200).json(result.data);
  }

  public async create(request: Request, response: Response): Promise<Response> {
    const createClientService = new CreateClientService(clientRepository);
    const authenticatedUserId = getAuthenticatedUserId(request);

    if (!authenticatedUserId) {
      return this.sendFailure(response, 401, "Usuário autenticado é obrigatório.");
    }

    const result = await createClientService.execute(authenticatedUserId, this.buildClientPayload(request));

    if (!result.success) {
      return this.sendFailure(response, result.statusCode, result.message);
    }

    await recordRequestAudit(request, "client.created", "client", result.data.client.id);

    return response.status(201).json(result.data);
  }

  public async update(request: Request, response: Response): Promise<Response> {
    const updateClientService = new UpdateClientService(clientRepository);
    const authenticatedUserId = getAuthenticatedUserId(request);

    if (!authenticatedUserId) {
      return this.sendFailure(response, 401, "Usuário autenticado é obrigatório.");
    }

    const id = Number(request.params.id);
    const result = await updateClientService.execute(authenticatedUserId, id, this.buildClientPayload(request));

    if (!result.success) {
      return this.sendFailure(response, result.statusCode, result.message);
    }

    await recordRequestAudit(request, "client.updated", "client", result.data.client.id);

    return response.status(200).json(result.data);
  }

  public async delete(request: Request, response: Response): Promise<Response> {
    const deleteClientService = new DeleteClientService(clientRepository);
    const authenticatedUserId = getAuthenticatedUserId(request);

    if (!authenticatedUserId) {
      return this.sendFailure(response, 401, "Usuário autenticado é obrigatório.");
    }

    const id = Number(request.params.id);
    const result = await deleteClientService.execute(authenticatedUserId, id);

    if (!result.success) {
      return this.sendFailure(response, result.statusCode, result.message);
    }

    await recordRequestAudit(request, "client.deleted", "client", id);

    return response.status(200).json(result.data);
  }

  private buildClientPayload(request: Request) {
    const body = asRequestBody(request.body);

    return {
      name: asString(body.name),
      email: asString(body.email),
      phone: asString(body.phone),
      cpf: asString(body.cpf),
      notes: asString(body.notes),
    };
  }

  private sendFailure(response: Response, statusCode: number, message: string): Response {
    return response.status(statusCode).json({ message });
  }
}
