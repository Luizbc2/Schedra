import pg from "pg";
import mysql2 from "mysql2";
import {
  DataTypes,
  Op,
  Sequelize,
  UniqueConstraintError,
  type Model,
  type ModelStatic,
  type Options,
} from "sequelize";

import { env } from "./env";
import { AppointmentModel } from "../modules/appointments/models/appointment.model";
import { UserModel } from "../modules/auth/models/user.model";
import { ClientModel } from "../modules/clients/models/client.model";
import { hashPassword, isPasswordHashed } from "../modules/auth/utils/password.util";
import { ServiceModel } from "../modules/services/models/service.model";
import { ProfessionalModel } from "../modules/professionals/models/professional.model";
import { ProfessionalWorkDayModel } from "../modules/professionals/models/professional-work-day.model";
import { initializePlatformModels } from "../platform/models/platform-models";
import { PersonalEventModel } from "../modules/personal-events/models/personal-event.model";
import { MigrationRunner } from "../database/migrations/migration-runner";
import { tenantService } from "../platform/tenancy/tenant.service";
import { AvatarAssetModel } from "../modules/users/models/avatar-asset.model";

type DynamicRecord = Model<Record<string, unknown>, Record<string, unknown>>;
const APPOINTMENT_SLOT_SIZE_MS = 5 * 60_000;

class Database {
  private sequelize: Sequelize | null = null;
  private modelsInitialized = false;

  public isConfigured(): boolean {
    const { url, host, name, user, password } = env.database;

    return Boolean(url || (host && name && user && password));
  }

  public getConnection(): Sequelize {
    if (!this.sequelize) {
      const dialect = env.database.dialect === "mysql" ? "mysql" : "postgres";
      const sharedOptions: Options = {
        dialect,
        logging: false,
        dialectModule: dialect === "mysql" ? mysql2 : pg,
      };

      if (env.database.ssl) {
        sharedOptions.dialectOptions = {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        };
      }

      this.sequelize = env.database.url
        ? new Sequelize(env.database.url, sharedOptions)
        : new Sequelize(env.database.name, env.database.user, env.database.password, {
            ...sharedOptions,
            host: env.database.host,
            port: env.database.port,
          });
    }

    return this.sequelize;
  }

  private initializeModels(): void {
    if (this.modelsInitialized) {
      return;
    }

    UserModel.initialize(this.getConnection());
    AvatarAssetModel.initialize(this.getConnection());
    ClientModel.initialize(this.getConnection());
    ServiceModel.initialize(this.getConnection());
    ProfessionalModel.initialize(this.getConnection());
    ProfessionalWorkDayModel.initialize(this.getConnection());
    AppointmentModel.initialize(this.getConnection());
    PersonalEventModel.initialize(this.getConnection());
    initializePlatformModels(this.getConnection());

    UserModel.hasMany(ClientModel, {
      foreignKey: "userId",
      as: "clients",
    });
    UserModel.hasMany(ServiceModel, {
      foreignKey: "userId",
      as: "services",
    });
    UserModel.hasMany(ProfessionalModel, {
      foreignKey: "userId",
      as: "professionals",
    });
    UserModel.hasMany(AppointmentModel, {
      foreignKey: "userId",
      as: "appointments",
    });
    UserModel.hasMany(PersonalEventModel, { foreignKey: "userId", as: "personalEvents" });
    ClientModel.hasMany(AppointmentModel, {
      foreignKey: "clientId",
      as: "appointments",
    });
    ProfessionalModel.hasMany(AppointmentModel, {
      foreignKey: "professionalId",
      as: "appointments",
    });
    ProfessionalModel.hasMany(ProfessionalWorkDayModel, {
      foreignKey: "professionalId",
      as: "workDays",
    });
    ServiceModel.hasMany(AppointmentModel, {
      foreignKey: "serviceId",
      as: "appointments",
    });

    ClientModel.belongsTo(UserModel, {
      foreignKey: "userId",
      as: "user",
    });
    ServiceModel.belongsTo(UserModel, {
      foreignKey: "userId",
      as: "user",
    });
    ProfessionalModel.belongsTo(UserModel, {
      foreignKey: "userId",
      as: "user",
    });
    AppointmentModel.belongsTo(UserModel, {
      foreignKey: "userId",
      as: "user",
    });
    PersonalEventModel.belongsTo(UserModel, { foreignKey: "userId", as: "user" });
    AppointmentModel.belongsTo(ClientModel, {
      foreignKey: "clientId",
      as: "client",
    });
    AppointmentModel.belongsTo(ProfessionalModel, {
      foreignKey: "professionalId",
      as: "professional",
    });
    ProfessionalWorkDayModel.belongsTo(ProfessionalModel, {
      foreignKey: "professionalId",
      as: "professional",
    });
    AppointmentModel.belongsTo(ServiceModel, {
      foreignKey: "serviceId",
      as: "service",
    });

    this.modelsInitialized = true;
  }

  private async seedAuthUser(): Promise<void> {
    if (!env.authSeedEnabled) {
      return;
    }

    const email = env.authSeedUser.email.toLowerCase();
    const hashedPassword = await hashPassword(env.authSeedUser.password);
    const existingUser = await UserModel.findOne({
      where: {
        [Op.or]: [{ email }, { cpf: env.authSeedUser.cpf }],
      },
    });

    if (!existingUser) {
      await UserModel.create({
        name: env.authSeedUser.name.trim(),
        email,
        cpf: env.authSeedUser.cpf,
        password: hashedPassword,
        role: "admin",
        active: true,
      });

      return;
    }

    const updates: Partial<{ name: string; email: string; password: string; role: "admin"; active: boolean }> = {
      name: env.authSeedUser.name.trim(),
      email,
      role: "admin",
      active: true,
    };

    if (!isPasswordHashed(existingUser.password)) {
      updates.password = hashedPassword;
    }

    await existingUser.update(updates);
  }

  public async connect(): Promise<boolean> {
    this.initializeModels();

    if (!this.isConfigured()) {
      console.log("Database connection skipped: configure database variables when ready.");
      return false;
    }

    try {
      await this.getConnection().authenticate();
      console.log("Database connection established.");
      return true;
    } catch (error) {
      console.log("Database connection failed. Backend will keep running without database access for now.");
      console.log(error instanceof Error ? error.message : "Database connection error not identified.");
      return false;
    }
  }

  public async synchronize(): Promise<void> {
    await this.migrate();
    await this.ensureUserProfileColumns();
    await this.seedAuthUser();
    await tenantService.provisionAllExistingUsers();
    await this.repairLegacyAppointments();
    await this.repairLegacyAppointmentSlots();

    console.log("Database tables synchronized.");
  }

  public async migrate(): Promise<void> {
    this.initializeModels();
    const connection = this.getConnection();

    if (env.database.dialect === "mysql") {
      await connection.sync();
      await new MigrationRunner(connection).run();
      return;
    }

    // Keep concurrent serverless cold starts from racing on table and index creation.
    const migrationLock = await connection.transaction();
    try {
      await connection.query("SELECT pg_advisory_xact_lock(1396918340)", {
        transaction: migrationLock,
      });
      await connection.sync();
      await new MigrationRunner(connection).run();
      await migrationLock.commit();
    } catch (error) {
      await migrationLock.rollback();
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.sequelize) {
      await this.sequelize.close();
      this.sequelize = null;
      this.modelsInitialized = false;
    }
  }

  public async ping(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.getConnection().authenticate();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureUserProfileColumns(): Promise<void> {
    const queryInterface = this.getConnection().getQueryInterface();
    const columns = await queryInterface.describeTable("users");

    if (!columns.accountType) {
      await queryInterface.addColumn("users", "accountType", {
        type: DataTypes.ENUM("business", "personal"),
        allowNull: false,
        defaultValue: "business",
      });
    }

    if (!columns.avatarUrl) {
      await queryInterface.addColumn("users", "avatarUrl", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!columns.role) {
      await queryInterface.addColumn("users", "role", {
        type: DataTypes.ENUM("admin", "user"),
        allowNull: false,
        defaultValue: "user",
      });
    }

    if (!columns.active) {
      await queryInterface.addColumn("users", "active", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  }

  private async repairLegacyAppointments(): Promise<void> {
    const appointments = await AppointmentModel.findAll({
      where: {
        [Op.or]: [
          { endsAt: null },
          { clientNameSnapshot: null },
          { professionalNameSnapshot: null },
          { serviceNameSnapshot: null },
        ],
      },
    });

    for (const appointment of appointments) {
      const [client, professional, service] = await Promise.all([
        ClientModel.findByPk(appointment.clientId, { paranoid: false }),
        ProfessionalModel.findByPk(appointment.professionalId, { paranoid: false }),
        ServiceModel.findByPk(appointment.serviceId, { paranoid: false }),
      ]);
      const durationMinutes = service?.durationMinutes ?? 30;
      appointment.durationMinutes ??= durationMinutes;
      appointment.endsAt ??= new Date(appointment.scheduledAt.getTime() + durationMinutes * 60_000);
      appointment.clientNameSnapshot ??= client?.name ?? "Cliente";
      appointment.professionalNameSnapshot ??= professional?.name ?? "Profissional";
      appointment.serviceNameSnapshot ??= service?.name ?? "Serviço";
      appointment.priceSnapshot ??= service ? Number(service.price) : 0;
      await appointment.save({ silent: true });
    }
  }

  private async repairLegacyAppointmentSlots(): Promise<void> {
    const Slot = this.getConnection().models.AppointmentSlot as ModelStatic<DynamicRecord>;
    const appointments = await AppointmentModel.findAll({
      where: {
        organizationId: { [Op.ne]: null },
        status: { [Op.ne]: "cancelado" },
      },
      order: [["id", "ASC"]],
    });
    const conflicts: number[] = [];

    for (const appointment of appointments) {
      if (!appointment.organizationId || !appointment.endsAt) continue;
      if (await Slot.count({ where: { appointmentId: appointment.id } })) continue;
      const slots: Array<Record<string, unknown>> = [];
      let cursor = Math.floor(appointment.scheduledAt.getTime() / APPOINTMENT_SLOT_SIZE_MS) * APPOINTMENT_SLOT_SIZE_MS;
      while (cursor < appointment.endsAt.getTime()) {
        slots.push({
          organizationId: appointment.organizationId,
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          slotStart: new Date(cursor),
        });
        cursor += APPOINTMENT_SLOT_SIZE_MS;
      }

      try {
        await this.getConnection().transaction((transaction) => Slot.bulkCreate(slots, { transaction }));
      } catch (error) {
        if (!(error instanceof UniqueConstraintError)) throw error;
        conflicts.push(appointment.id);
      }
    }

    if (conflicts.length) {
      console.warn(`Legacy scheduling conflicts detected for appointment ids: ${conflicts.join(", ")}.`);
    }
  }
}

export const database = new Database();
