import { ForeignKeyConstraintError, ValidationError } from "sequelize";

import {
  AppointmentDto,
  AppointmentStatus,
  CreateAppointmentRequestDto,
} from "../dtos/appointment.dto";
import {
  hasTextLengthBetween,
  INPUT_LIMITS,
  isPositiveInteger,
  normalizeMultiLineText,
} from "../../../shared/utils/input-validation.util";
import { AppointmentRepository } from "../repositories/appointment.repository";
import { ClientRepository } from "../../clients/repositories/client.repository";
import { ProfessionalRepository } from "../../professionals/repositories/professional.repository";
import { ServiceRepository } from "../../services/repositories/service.repository";
import { AppointmentConflictError } from "../errors/appointment-conflict.error";
import { AppointmentAccessError } from "../errors/appointment-access.error";
import { SchedulingPolicyService } from "./scheduling-policy.service";
import { AppointmentInterval } from "../domain/appointment-interval";
import { ServicePrice } from "../domain/service-price";

type CreateAppointmentResponseDto = {
  appointment: AppointmentDto;
  message: string;
};

type CreateAppointmentServiceResult =
  | {
      success: true;
      data: CreateAppointmentResponseDto;
    }
  | {
      success: false;
      message: string;
      statusCode: number;
    };

const VALID_STATUSES: AppointmentStatus[] = ["confirmado", "pendente", "cancelado"];

export class CreateAppointmentService {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clientRepository: ClientRepository,
    private readonly professionalRepository: ProfessionalRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly schedulingPolicy = new SchedulingPolicyService(),
  ) {}

  public async execute(
    userId: number,
    input: CreateAppointmentRequestDto,
  ): Promise<CreateAppointmentServiceResult> {
    const clientId = Number(input.clientId);
    const professionalId = Number(input.professionalId);
    const serviceId = Number(input.serviceId);
    const scheduledAt = input.scheduledAt?.trim();
    const status = input.status?.trim().toLowerCase() as AppointmentStatus;
    const notes = normalizeMultiLineText(input.notes, INPUT_LIMITS.notes);

    if (!clientId || !professionalId || !serviceId || !scheduledAt || !status) {
      return {
        success: false,
        message: "Cliente, profissional, serviço, horário e status são obrigatórios.",
        statusCode: 400,
      };
    }

    if (!this.isValidStatus(status)) {
      return {
        success: false,
        message: "Status do agendamento inválido.",
        statusCode: 400,
      };
    }

    if (Number.isNaN(Date.parse(scheduledAt))) {
      return {
        success: false,
        message: "Horário do agendamento inválido.",
        statusCode: 400,
      };
    }

    if (!isPositiveInteger(clientId) || !isPositiveInteger(professionalId) || !isPositiveInteger(serviceId)) {
      return {
        success: false,
        message: "Cliente, profissional e serviço precisam ser identificadores válidos.",
        statusCode: 400,
      };
    }

    if (input.notes && !hasTextLengthBetween(notes, 3, INPUT_LIMITS.notes)) {
      return {
        success: false,
        message: "As observações do agendamento devem ter entre 3 e 500 caracteres.",
        statusCode: 400,
      };
    }

    const [client, professional, service] = await Promise.all([
      this.clientRepository.findById(userId, clientId),
      this.professionalRepository.findById(userId, professionalId),
      this.serviceRepository.findById(userId, serviceId),
    ]);

    if (!client || !professional || !service) {
      return {
        success: false,
        message: "Cliente, profissional ou serviço não encontrado para a organização ativa.",
        statusCode: 400,
      };
    }

    let interval: AppointmentInterval;
    let price: ServicePrice;
    try {
      interval = AppointmentInterval.fromDuration(scheduledAt, service.durationMinutes);
      price = ServicePrice.fromAmount(service.price);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { success: false, message: error.message, statusCode: 400 };
    }
    const startsAt = interval.startsAt;
    const endsAt = interval.endsAt;
    const policy = await this.schedulingPolicy.validate(professionalId, serviceId, startsAt, endsAt);
    if (!policy.valid) return { success: false, message: policy.message, statusCode: 409 };

    try {
      const appointment = await this.appointmentRepository.create(userId, {
        clientId,
        professionalId,
        serviceId,
        scheduledAt,
        endsAt: endsAt.toISOString(),
        durationMinutes: interval.durationMinutes,
        clientNameSnapshot: client.name,
        professionalNameSnapshot: professional.name,
        serviceNameSnapshot: service.name,
        priceSnapshot: price.toAmount(),
        status,
        notes,
      });

      return {
        success: true,
        data: {
          appointment,
          message: "Agendamento cadastrado com sucesso.",
        },
      };
    } catch (error) {
      if (error instanceof AppointmentAccessError) {
        return { success: false, message: error.message, statusCode: 403 };
      }

      if (error instanceof AppointmentConflictError) {
        return { success: false, message: error.message, statusCode: 409 };
      }

      if (error instanceof ForeignKeyConstraintError) {
        return {
          success: false,
          message: "Cliente, profissional ou serviço informado não existe.",
          statusCode: 400,
        };
      }

      if (error instanceof ValidationError) {
        return {
          success: false,
          message: "Dados do agendamento são inválidos.",
          statusCode: 400,
        };
      }

      throw error;
    }
  }

  private isValidStatus(status: AppointmentStatus): boolean {
    return VALID_STATUSES.includes(status);
  }

}
