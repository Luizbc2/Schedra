import { database } from "../../config/database";
import { SequelizeAppointmentRepository } from "../../modules/appointments/repositories/sequelize-appointment.repository";
import { CreateAppointmentService } from "../../modules/appointments/services/create-appointment.service";
import { UserModel } from "../../modules/auth/models/user.model";
import { hashPassword } from "../../modules/auth/utils/password.util";
import { SequelizeClientRepository } from "../../modules/clients/repositories/sequelize-client.repository";
import { SequelizeProfessionalRepository } from "../../modules/professionals/repositories/sequelize-professional.repository";
import { SequelizeServiceRepository } from "../../modules/services/repositories/sequelize-service.repository";
import { tenantService } from "../../platform/tenancy/tenant.service";
import { runWithRequestContext } from "../../shared/http/request-context";
import request from "supertest";
import sharp from "sharp";
import { App } from "../../app";
import { ClientModel } from "../../modules/clients/models/client.model";

const describeWithDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase("tenant and scheduling database guarantees", () => {
  const clients = new SequelizeClientRepository();
  const professionals = new SequelizeProfessionalRepository();
  const services = new SequelizeServiceRepository();
  const appointments = new SequelizeAppointmentRepository();
  let firstUser: UserModel;
  let secondUser: UserModel;
  let firstWorkspace: Awaited<ReturnType<typeof tenantService.ensureDefaultWorkspace>>;
  let secondWorkspace: Awaited<ReturnType<typeof tenantService.ensureDefaultWorkspace>>;
  let runSuffix: string;
  let token: string;
  let secondToken: string;
  const app = new App().server;

  beforeAll(async () => {
    expect(await database.connect()).toBe(true);
    await database.synchronize();
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    runSuffix = suffix;
    const password = await hashPassword("Integration!123");
    firstUser = await UserModel.create({
      name: "Tenant A",
      email: `tenant-a-${suffix}@schedra.test`,
      cpf: suffix.padStart(11, "1").slice(-11),
      password,
      active: true,
    });
    secondUser = await UserModel.create({
      name: "Tenant B",
      email: `tenant-b-${suffix}@schedra.test`,
      cpf: `${Number(suffix.slice(-10) || "1") + 1}`.padStart(11, "2").slice(-11),
      password,
      active: true,
    });
    firstWorkspace = await tenantService.ensureDefaultWorkspace(firstUser);
    secondWorkspace = await tenantService.ensureDefaultWorkspace(secondUser);
    for (const user of [firstUser, secondUser]) {
      const login = await request(app).post("/api/auth/login").send({ email: user.email, password: "Integration!123" });
      expect(login.status).toBe(200);
      if (user === firstUser) token = login.body.token;
      else secondToken = login.body.token;
    }
  }, 60_000);

  afterAll(async () => {
    await database.close();
  });

  const inWorkspace = <T>(user: UserModel, workspace: typeof firstWorkspace, action: () => Promise<T>) =>
    runWithRequestContext({
      userId: user.id,
      organizationId: workspace.id,
      membershipId: workspace.membershipId,
      organizationRole: workspace.role,
    }, action);

  it("executes HTTP CRUD with real sessions, tenant isolation and persisted changes", async () => {
    const input = { name: "Cliente CRUD", email: `crud-${runSuffix}@schedra.test`, phone: "11999999999", cpf: "", notes: "Teste de integração" };
    const created = await request(app).post("/api/clients").auth(token, { type: "bearer" }).send(input);
    expect(created.status).toBe(201);
    const id = created.body.client.id;
    const updated = await request(app).put(`/api/clients/${id}`).auth(token, { type: "bearer" }).send({ ...input, notes: "Alteração persistida" });
    expect(updated.status).toBe(200);
    expect((await ClientModel.findByPk(id))?.notes).toBe("Alteração persistida");
    const list = await request(new App().server).get("/api/clients?search=Cliente%20CRUD").auth(token, { type: "bearer" });
    expect(list.body.data.some((client: { id: number }) => client.id === id)).toBe(true);
    expect((await request(app).put(`/api/clients/${id}`).auth(secondToken, { type: "bearer" }).send(input)).status).toBe(404);
    expect((await request(app).delete(`/api/clients/${id}`).auth(secondToken, { type: "bearer" })).status).toBe(404);
    expect((await request(app).delete(`/api/clients/${id}`).auth(token, { type: "bearer" })).status).toBe(200);
    expect(await ClientModel.findByPk(id)).toBeNull();
    expect((await ClientModel.findByPk(id, { paranoid: false }))?.deletedAt).toBeTruthy();
  });

  it("uploads and retrieves an avatar from another app instance using the database", async () => {
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#12695b" } }).png().toBuffer();
    const uploaded = await request(app).patch("/api/users/me/avatar").auth(token, { type: "bearer" }).attach("avatar", bytes, "avatar.png");
    expect(uploaded.status).toBe(200);
    const url = uploaded.body.user.avatarUrl;
    expect((await UserModel.findByPk(firstUser.id))?.avatarUrl).toBe(url);
    const image = await request(new App().server).get(url);
    expect(image.status).toBe(200);
    expect((await sharp(image.body).metadata()).format).toBe("webp");
  });

  it("não deixa um tenant ler o cliente de outro", async () => {
    const client = await inWorkspace(firstUser, firstWorkspace, () => clients.create(firstUser.id, {
      name: "Cliente exclusivo A",
      email: `cliente-a-${runSuffix}@schedra.test`,
      phone: "11999999999",
      cpf: "",
      notes: "",
    }));
    const leaked = await inWorkspace(secondUser, secondWorkspace, () => clients.findById(secondUser.id, client.id));
    expect(leaked).toBeNull();
  });

  it("confirma somente uma de duas reservas concorrentes para o mesmo intervalo", async () => {
    const dependencies = await inWorkspace(firstUser, firstWorkspace, async () => ({
      client: await clients.create(firstUser.id, {
        name: "Cliente da concorrência",
        email: `concorrencia-${runSuffix}@schedra.test`,
        phone: "11988888888",
        cpf: "",
        notes: "",
      }),
      professional: await professionals.create(firstUser.id, {
        name: "Profissional concorrência",
        email: firstUser.email,
        phone: "11977777777",
        specialty: "Cabelo",
        status: "ativo",
      }),
      service: await services.create(firstUser.id, {
        name: "Serviço concorrência",
        category: "Cabelo",
        durationMinutes: 45,
        price: 80,
        description: "",
      }),
    }));
    const createAppointment = new CreateAppointmentService(appointments, clients, professionals, services);
    const input = {
      clientId: dependencies.client.id,
      professionalId: dependencies.professional.id,
      serviceId: dependencies.service.id,
      scheduledAt: "2030-09-03T12:00:00.000Z",
      status: "confirmado" as const,
      notes: "",
    };

    const results = await inWorkspace(firstUser, firstWorkspace, () => Promise.all([
      createAppointment.execute(firstUser.id, input),
      createAppointment.execute(firstUser.id, input),
    ]));
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => !result.success && result.statusCode === 409)).toHaveLength(1);
  }, 30_000);

  it("preserva o snapshot do agendamento após arquivar o cliente", async () => {
    const dependencies = await inWorkspace(firstUser, firstWorkspace, async () => ({
      client: await clients.create(firstUser.id, {
        name: "Cliente histórico",
        email: `historico-${runSuffix}@schedra.test`,
        phone: "11966666666",
        cpf: "",
        notes: "",
      }),
      professional: await professionals.create(firstUser.id, {
        name: "Profissional histórico",
        email: `profissional-${runSuffix}@schedra.test`,
        phone: "11955555555",
        specialty: "Consulta",
        status: "ativo",
      }),
      service: await services.create(firstUser.id, {
        name: "Serviço histórico",
        category: "Consulta",
        durationMinutes: 30,
        price: 95,
        description: "",
      }),
    }));
    const createAppointment = new CreateAppointmentService(appointments, clients, professionals, services);
    const result = await inWorkspace(firstUser, firstWorkspace, () => createAppointment.execute(firstUser.id, {
      clientId: dependencies.client.id,
      professionalId: dependencies.professional.id,
      serviceId: dependencies.service.id,
      scheduledAt: "2030-09-04T12:00:00.000Z",
      status: "confirmado",
      notes: "",
    }));
    expect(result.success).toBe(true);
    if (!result.success) return;

    await inWorkspace(firstUser, firstWorkspace, () => clients.delete(firstUser.id, dependencies.client.id));
    const [archivedClient, historicalAppointment] = await inWorkspace(firstUser, firstWorkspace, () => Promise.all([
      clients.findById(firstUser.id, dependencies.client.id),
      appointments.findById(firstUser.id, result.data.appointment.id),
    ]));

    expect(archivedClient).toBeNull();
    expect(historicalAppointment?.clientName).toBe("Cliente histórico");
  }, 30_000);
});
