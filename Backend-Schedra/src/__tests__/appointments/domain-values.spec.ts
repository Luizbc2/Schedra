import { AppointmentInterval } from "../../modules/appointments/domain/appointment-interval";
import { ServicePrice } from "../../modules/appointments/domain/service-price";
import { CreateAppointmentService } from "../../modules/appointments/services/create-appointment.service";
import type { AppointmentRepository } from "../../modules/appointments/repositories/appointment.repository";
import type { ClientRepository } from "../../modules/clients/repositories/client.repository";
import type { ProfessionalRepository } from "../../modules/professionals/repositories/professional.repository";
import type { ServiceRepository } from "../../modules/services/repositories/service.repository";
import type { SchedulingPolicyService } from "../../modules/appointments/services/scheduling-policy.service";

describe("Value objects da Agenda", () => {
  it("intervalos com o mesmo instante sao iguais, imutaveis e semiabertos", () => {
    const interval = AppointmentInterval.fromDuration("2030-01-10T09:00:00-03:00", 60);
    expect(interval.equals(AppointmentInterval.fromDuration("2030-01-10T12:00:00Z", 60))).toBe(true);
    const start = interval.startsAt;
    start.setFullYear(2000);
    expect(interval.startsAt.toISOString()).toBe("2030-01-10T12:00:00.000Z");
    expect(interval.endsAt.toISOString()).toBe("2030-01-10T13:00:00.000Z");
    expect(interval.overlaps(AppointmentInterval.fromDuration(interval.endsAt, 30))).toBe(false);
    expect(interval.overlaps(AppointmentInterval.fromDuration("2030-01-10T12:30:00Z", 15))).toBe(true);
    expect(Object.isFrozen(interval)).toBe(true);
  });
  it.each([0, -1, 1.5, NaN, Infinity])("recusa duracao invalida %s", duration => {
    expect(() => AppointmentInterval.fromDuration("2030-01-10T12:00:00Z", duration)).toThrow(RangeError);
  });
  it("recusa datas invalidas e overflow", () => {
    expect(() => AppointmentInterval.fromDuration("invalido", 30)).toThrow(RangeError);
    expect(() => AppointmentInterval.fromDuration(new Date(8.64e15), 1)).toThrow(RangeError);
  });
  it("preco representa centavos sem identidade nem mutacao", () => {
    const price = ServicePrice.fromAmount(19.90);
    expect(price.cents).toBe(1990);
    expect(price.toAmount()).toBe(19.9);
    expect(price.equals(ServicePrice.fromAmount(19.9))).toBe(true);
    expect(ServicePrice.fromAmount(0).cents).toBe(0);
    expect(Object.isFrozen(price)).toBe(true);
  });
  it.each([-1, NaN, Infinity, 1.001, Number.MAX_VALUE])("recusa preco invalido %s", price => {
    expect(() => ServicePrice.fromAmount(price)).toThrow(RangeError);
  });
  it("criacao usa os valores e impede persistir um servico com preco invalido", async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const catalog = { id: 1, name: "Corte", durationMinutes: 30, price: 19.9 };
    const validate = jest.fn().mockResolvedValue({ valid: true });
    const service = new CreateAppointmentService(
      { create } as unknown as AppointmentRepository,
      { findById: jest.fn().mockResolvedValue({ name: "Cliente" }) } as unknown as ClientRepository,
      { findById: jest.fn().mockResolvedValue({ name: "Equipe" }) } as unknown as ProfessionalRepository,
      { findById: jest.fn().mockImplementation(async () => catalog) } as unknown as ServiceRepository,
      { validate } as unknown as SchedulingPolicyService,
    );
    const input = { clientId: 1, professionalId: 1, serviceId: 1,
      scheduledAt: "2030-01-10T12:00:00Z", status: "confirmado" as const, notes: "" };
    expect((await service.execute(1, input)).success).toBe(true);
    expect(create).toHaveBeenCalledWith(1, expect.objectContaining({
      priceSnapshot: 19.9, durationMinutes: 30, endsAt: "2030-01-10T12:30:00.000Z",
    }));
    catalog.price = -1;
    expect(await service.execute(1, input)).toMatchObject({ success: false, statusCode: 400 });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
