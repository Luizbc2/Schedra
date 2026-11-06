import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize";

export class AvatarAssetModel extends Model<InferAttributes<AvatarAssetModel>, InferCreationAttributes<AvatarAssetModel>> {
  declare filename: string;
  declare userId: number;
  declare content: Buffer;
  declare createdAt: CreationOptional<Date>;

  static initialize(sequelize: Sequelize): void {
    AvatarAssetModel.init({
      filename: { type: DataTypes.STRING(120), primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      content: { type: DataTypes.BLOB("medium"), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    }, { sequelize, modelName: "AvatarAsset", tableName: "avatar_assets", timestamps: true, updatedAt: false });
  }
}
