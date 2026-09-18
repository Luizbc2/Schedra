import { Request, Response } from "express";

import { CreateUserService } from "../services/create-user.service";
import { UpdateUserProfileService } from "../services/update-user-profile.service";
import { getAuthenticatedUserId } from "../../auth/utils/auth-request.util";
import { asRequestBody, asString } from "../../../shared/http/request-parser";
import {
  InvalidAvatarContentError,
  processAvatar,
  removeLocalAvatar,
} from "../upload/avatar-upload";
import { recordRequestAudit } from "../../../shared/http/request-audit";
import type { SessionService } from "../../auth/services/session.service";

export class UsersController {
  constructor(
    private readonly createUserService: CreateUserService,
    private readonly updateUserProfileService: UpdateUserProfileService,
    private readonly sessionService?: SessionService,
  ) {}

  public async create(request: Request, response: Response): Promise<Response> {
    try {
      const result = await this.createUserService.execute(this.buildCreatePayload(request));

      if (!result.success) {
        return this.sendFailure(response, result.statusCode, result.message);
      }

      return response.status(201).json(result.data);
    } catch (error) {
      console.error("User registration request failed.", error);

      return response.status(500).json({
        message: "Não foi possível processar o cadastro de usuário agora.",
      });
    }
  }

  public async updateMe(request: Request, response: Response): Promise<Response> {
    try {
      const authenticatedUserId = getAuthenticatedUserId(request);

      if (!authenticatedUserId) {
        return this.sendFailure(response, 401, "Usuario autenticado nao identificado.");
      }

      const result = await this.updateUserProfileService.execute(
        this.buildUpdatePayload(request, authenticatedUserId),
      );

      if (!result.success) {
        return this.sendFailure(response, result.statusCode, result.message);
      }

      if (result.passwordChanged && this.sessionService) {
        if (request.auth?.sid) {
          await this.sessionService.revokeAllForUserExcept(authenticatedUserId, request.auth.sid);
        } else {
          await this.sessionService.revokeAllForUser(authenticatedUserId);
        }
      }

      await recordRequestAudit(request, "user.profile_updated", "user", authenticatedUserId, {
        passwordChanged: result.passwordChanged,
      });
      return response.status(200).json(result.data);
    } catch (error) {
      console.error("User profile update request failed.", error);

      return response.status(500).json({
        message: "Não foi possível processar a atualização do perfil agora.",
      });
    }
  }

  public async updateAvatar(request: Request, response: Response): Promise<Response> {
    const authenticatedUserId = getAuthenticatedUserId(request);

    if (!authenticatedUserId) {
      return this.sendFailure(response, 401, "Usuario autenticado nao identificado.");
    }

    if (!request.file) {
      return this.sendFailure(response, 400, "Selecione uma imagem para o avatar.");
    }

    let avatarUrl: string;

    try {
      avatarUrl = await processAvatar(request.file, authenticatedUserId);
    } catch (error) {
      if (error instanceof InvalidAvatarContentError) {
        return this.sendFailure(response, 415, error.message);
      }
      throw error;
    }

    try {
      const previousUser = await this.updateUserProfileService.findById(authenticatedUserId);
      const user = await this.updateUserProfileService.updateAvatar(authenticatedUserId, avatarUrl);

      if (!user) {
        await removeLocalAvatar(avatarUrl);
        return this.sendFailure(response, 404, "Usuário não encontrado.");
      }

      await removeLocalAvatar(previousUser?.avatarUrl);
      await recordRequestAudit(request, "user.avatar_updated", "user", authenticatedUserId);
      return response.status(200).json({ message: "Avatar atualizado com sucesso.", user });
    } catch (error) {
      await removeLocalAvatar(avatarUrl);
      throw error;
    }
  }

  private buildCreatePayload(request: Request) {
    const body = asRequestBody(request.body);

    return {
      name: asString(body.name),
      email: asString(body.email),
      cpf: asString(body.cpf),
      currentPassword: asString(body.currentPassword),
      password: asString(body.password),
    };
  }

  private buildUpdatePayload(request: Request, authenticatedUserId: number) {
    const body = asRequestBody(request.body);

    return {
      authenticatedUserId,
      userId: authenticatedUserId,
      name: asString(body.name),
      email: asString(body.email),
      cpf: asString(body.cpf),
      password: asString(body.password),
    };
  }

  private sendFailure(response: Response, statusCode: number, message: string): Response {
    return response.status(statusCode).json({ message });
  }
}



