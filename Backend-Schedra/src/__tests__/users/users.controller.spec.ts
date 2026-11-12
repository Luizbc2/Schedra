import express from "express";
import request from "supertest";

import { UsersController } from "../../modules/users/controllers/users.controller";
import { CreateUserService } from "../../modules/users/services/create-user.service";
import { UpdateUserProfileService } from "../../modules/users/services/update-user-profile.service";
import { comparePassword, hashPassword } from "../../modules/auth/utils/password.util";
import { InMemoryUserRepository } from "../mocks/in-memory-user.repository";

jest.mock("../../shared/http/request-audit");

it("passes the current password from the HTTP request to the password change service", async () => {
  const currentPassword = "SenhaAtual1!";
  const password = "SenhaNova2!";
  const profile = { name: "Maria", email: "maria@schedra.test", cpf: "52998224725" };
  const repository = new InMemoryUserRepository({
    users: [{ ...profile, id: 1, password: await hashPassword(currentPassword) }],
  });
  const controller = new UsersController(new CreateUserService(repository), new UpdateUserProfileService(repository));
  const app = express();
  app.use(express.json());
  app.put("/api/users/me", (req, res) => {
    req.auth = { sub: "1", email: profile.email, role: "user" };
    return controller.updateMe(req, res);
  });

  const rejected = await request(app).put("/api/users/me").send({ ...profile, currentPassword: "SenhaErrada1!", password });
  expect(rejected.status).toBe(401);
  const updated = await request(app).put("/api/users/me").send({ ...profile, currentPassword, password });
  expect(updated.status).toBe(200);
  expect(updated.body.user).not.toHaveProperty("password");
  expect(await comparePassword(password, (await repository.findById(1))!.password)).toBe(true);
});
