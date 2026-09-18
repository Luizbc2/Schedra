import { UpdateUserProfileService } from "../../modules/users/services/update-user-profile.service";
import { comparePassword, hashPassword } from "../../modules/auth/utils/password.util";
import { InMemoryUserRepository } from "../mocks/in-memory-user.repository";

describe("UpdateUserProfileService", () => {
  it("exige os campos obrigatórios para editar o perfil", async () => {
    const service = new UpdateUserProfileService(new InMemoryUserRepository());

    const result = await service.execute({
      authenticatedUserId: 0,
      userId: 0,
      name: "",
      email: "",
      cpf: "",
      password: "",
    });

    expect(result).toEqual({
      success: false,
      message: "Id do usuário autenticado, id do usuário, nome e CPF são obrigatórios.",
      statusCode: 400,
    });
  });

  it("permite editar apenas o proprio usuario", async () => {
    const repository = new InMemoryUserRepository({
      users: [
        {
          id: 1,
          name: "Maria",
          email: "maria@schedra.com",
          cpf: "52998224725",
          password: "hash",
        },
      ],
    });
    const service = new UpdateUserProfileService(repository);

    const result = await service.execute({
      authenticatedUserId: 2,
      userId: 1,
      name: "Maria Atualizada",
      email: "maria@schedra.com",
      cpf: "52998224725",
      password: "Senha123!",
    });

    expect(result).toEqual({
      success: false,
      message: "Você só pode editar o próprio perfil.",
      statusCode: 403,
    });
  });

  it("não permite alterar o e-mail", async () => {
    const repository = new InMemoryUserRepository({
      users: [
        {
          id: 1,
          name: "Maria",
          email: "maria@schedra.com",
          cpf: "52998224725",
          password: "hash",
        },
      ],
    });
    const service = new UpdateUserProfileService(repository);

    const result = await service.execute({
      authenticatedUserId: 1,
      userId: 1,
      name: "Maria Atualizada",
      email: "outro@schedra.com",
      cpf: "52998224725",
      password: "Senha123!",
    });

    expect(result).toEqual({
      success: false,
      message: "O e-mail não pode ser alterado.",
      statusCode: 400,
    });
  });

  it("valida CPF ao editar o perfil", async () => {
    const repository = new InMemoryUserRepository({
      users: [
        {
          id: 1,
          name: "Maria",
          email: "maria@schedra.com",
          cpf: "52998224725",
          password: "hash",
        },
      ],
    });
    const service = new UpdateUserProfileService(repository);

    const result = await service.execute({
      authenticatedUserId: 1,
      userId: 1,
      name: "Maria Atualizada",
      email: "maria@schedra.com",
      cpf: "12345678900",
      password: "Senha123!",
    });

    expect(result).toEqual({
      success: false,
      message: "CPF inválido.",
      statusCode: 400,
    });
  });

  it("atualiza o proprio perfil sem trocar o e-mail e com senha criptografada", async () => {
    const currentPassword = await hashPassword("SenhaAtual1!");
    const repository = new InMemoryUserRepository({
      users: [
        {
          id: 1,
          name: "Maria",
          email: "maria@schedra.com",
          cpf: "52998224725",
          password: currentPassword,
        },
      ],
    });
    const service = new UpdateUserProfileService(repository);

    const result = await service.execute({
      authenticatedUserId: 1,
      userId: 1,
      name: "  Maria Atualizada  ",
      email: "maria@schedra.com",
      cpf: "111.444.777-35",
      currentPassword: "SenhaAtual1!",
      password: "Senha123!",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    expect(result.data.user).toEqual({
      id: 1,
      name: "Maria Atualizada",
      email: "maria@schedra.com",
      cpf: "11144477735",
      accountType: "business",
      role: "user",
      active: true,
      avatarUrl: null,
    });
    await expect(comparePassword("Senha123!", repository.lastUpdatedInput?.password ?? "")).resolves.toBe(true);
    expect(result.passwordChanged).toBe(true);
  });

  it("recusa a troca quando a senha atual está incorreta", async () => {
    const repository = new InMemoryUserRepository({
      users: [{
        id: 1,
        name: "Maria",
        email: "maria@schedra.com",
        cpf: "52998224725",
        password: await hashPassword("SenhaAtual1!"),
      }],
    });

    const result = await new UpdateUserProfileService(repository).execute({
      authenticatedUserId: 1,
      userId: 1,
      name: "Maria",
      email: "maria@schedra.com",
      cpf: "52998224725",
      currentPassword: "SenhaErrada1!",
      password: "SenhaNova1!",
    });

    expect(result).toEqual({
      success: false,
      message: "Senha atual incorreta.",
      statusCode: 401,
    });
  });

  it("atualiza dados pessoais sem obrigar a troca de senha", async () => {
    const repository = new InMemoryUserRepository({
      users: [{
        id: 1,
        name: "Maria",
        email: "maria@schedra.com",
        cpf: "52998224725",
        password: "hash-existente",
      }],
    });
    const result = await new UpdateUserProfileService(repository).execute({
      authenticatedUserId: 1,
      userId: 1,
      name: "Maria Atualizada",
      email: "maria@schedra.com",
      cpf: "52998224725",
      password: "",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.passwordChanged).toBe(false);
    expect(repository.lastUpdatedInput?.password).toBeUndefined();
    expect((await repository.findById(1))?.password).toBe("hash-existente");
  });
});

