import { DataTypes, QueryTypes, type QueryInterface, type Sequelize } from "sequelize";

type Migration = {
  id: string;
  up: (queryInterface: QueryInterface) => Promise<void>;
};

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  definition: Parameters<QueryInterface["addColumn"]>[2],
): Promise<void> => {
  const columns = await queryInterface.describeTable(tableName);

  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

const addIndexIfMissing = async (
  queryInterface: QueryInterface,
  tableName: string,
  fields: string[],
  name: string,
  unique = false,
): Promise<void> => {
  const indexes = await queryInterface.showIndex(tableName) as Array<{ name: string }>;

  if (!indexes.some((index) => index.name === name)) {
    await queryInterface.addIndex(tableName, fields, { name, unique });
  }
};

const migrations: Migration[] = [
  {
    id: "20260901-001-tenant-scheduling-core",
    up: async (queryInterface) => {
      for (const tableName of ["clients", "services", "professionals", "appointments"]) {
        await addColumnIfMissing(queryInterface, tableName, "organizationId", {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "organizations", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        });
        await addIndexIfMissing(
          queryInterface,
          tableName,
          ["organizationId"],
          `${tableName}_organization_id_idx`,
        );
      }

      await addColumnIfMissing(queryInterface, "appointments", "endsAt", {
        type: DataTypes.DATE,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, "appointments", "durationMinutes", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, "appointments", "serviceNameSnapshot", {
        type: DataTypes.STRING,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, "appointments", "priceSnapshot", {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, "appointments", "version", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
      await addColumnIfMissing(queryInterface, "users", "deletedAt", {
        type: DataTypes.DATE,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, "professionals", "membershipId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "memberships", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    },
  },
  {
    id: "20260901-002-platform-tenant-columns",
    up: async (queryInterface) => {
      await addColumnIfMissing(queryInterface, "service_categories", "organizationId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "organizations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
      await addColumnIfMissing(queryInterface, "waitlist_entries", "organizationId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "organizations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      });
    },
  },
  {
    id: "20260901-003-scheduling-and-tenant-indexes",
    up: async (queryInterface) => {
      await addColumnIfMissing(queryInterface, "organizations", "timezone", {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "America/Sao_Paulo",
      });
      await addIndexIfMissing(
        queryInterface,
        "appointments",
        ["organizationId", "scheduledAt"],
        "appointments_organization_schedule_idx",
      );
      await addIndexIfMissing(
        queryInterface,
        "appointments",
        ["organizationId", "professionalId", "scheduledAt"],
        "appointments_professional_schedule_idx",
      );
      await addIndexIfMissing(
        queryInterface,
        "professionals",
        ["organizationId", "membershipId"],
        "professionals_membership_idx",
      );
      await addIndexIfMissing(
        queryInterface,
        "service_categories",
        ["organizationId"],
        "service_categories_organization_id_idx",
      );
      await addIndexIfMissing(
        queryInterface,
        "waitlist_entries",
        ["organizationId"],
        "waitlist_entries_organization_id_idx",
      );
      await addIndexIfMissing(queryInterface, "users", ["deletedAt"], "users_deleted_at_idx");
    },
  },
  {
    id: "20260901-004-soft-delete-and-appointment-snapshots",
    up: async (queryInterface) => {
      for (const tableName of ["clients", "services", "professionals", "appointments"]) {
        await addColumnIfMissing(queryInterface, tableName, "deletedAt", {
          type: DataTypes.DATE,
          allowNull: true,
        });
        await addIndexIfMissing(queryInterface, tableName, ["deletedAt"], `${tableName}_deleted_at_idx`);
      }
      await addColumnIfMissing(queryInterface, "appointments", "clientNameSnapshot", {
        type: DataTypes.STRING,
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, "appointments", "professionalNameSnapshot", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    },
  },
  {
    id: "20260902-005-user-profile-columns",
    up: async (queryInterface) => {
      await addColumnIfMissing(queryInterface, "users", "accountType", {
        type: DataTypes.ENUM("business", "personal"),
        allowNull: false,
        defaultValue: "business",
      });
      await addColumnIfMissing(queryInterface, "users", "role", {
        type: DataTypes.ENUM("admin", "user"),
        allowNull: false,
        defaultValue: "user",
      });
      await addColumnIfMissing(queryInterface, "users", "active", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
      await addColumnIfMissing(queryInterface, "users", "avatarUrl", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      });
    },
  },
];

export class MigrationRunner {
  constructor(private readonly sequelize: Sequelize) {}

  public async run(): Promise<void> {
    const queryInterface = this.sequelize.getQueryInterface();
    await queryInterface.createTable("schema_migrations", {
      id: { type: DataTypes.STRING(100), primaryKey: true, allowNull: false },
      executedAt: { type: DataTypes.DATE, allowNull: false },
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("already exists") && !message.includes("exists")) throw error;
    });

    const appliedRows = await this.sequelize.query<{ id: string }>(
      "SELECT id FROM schema_migrations",
      { type: QueryTypes.SELECT },
    );
    const applied = new Set(appliedRows.map((row) => row.id));

    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;

      await this.sequelize.transaction(async (transaction) => {
        const transactionalQueryInterface = this.sequelize.getQueryInterface();
        await migration.up(transactionalQueryInterface);
        await transactionalQueryInterface.bulkInsert(
          "schema_migrations",
          [{ id: migration.id, executedAt: new Date() }],
          { transaction },
        );
      });
    }
  }
}
