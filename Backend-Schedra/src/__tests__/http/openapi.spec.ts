import { openApiDocument } from "../../docs/openapi";

describe("Contrato OpenAPI", () => {
  it("todos os refs locais existem e parametros de id sao obrigatorios", () => {
    const document = openApiDocument as unknown as Record<string, unknown>;
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      if ("$ref" in value) {
        const ref = String(value.$ref);
        expect(ref.startsWith("#/components/schemas/")).toBe(true);
        const target = ref.slice(2).split("/").reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], document);
        expect(target).toBeDefined();
      }
      Object.values(value).forEach(visit);
    };
    visit(document);
    expect(openApiDocument.paths["/api/clients/{id}"].parameters[0]).toMatchObject({ name: "id", required: true });
  });
  it("inclui CRUD, pagina/busca, seguranca e contrato multipart de avatar", () => {
    const clients = openApiDocument.paths["/api/clients"];
    expect(clients.get.parameters.map(parameter => parameter.name)).toEqual(["page", "limit", "search"]);
    expect(clients.post.requestBody.required).toBe(true);
    expect(openApiDocument.paths["/api/clients/{id}"].delete.security).toEqual([{ bearerAuth: [] }]);
    expect(openApiDocument.paths["/api/users/me/avatar"].patch.requestBody.content["multipart/form-data"].schema.required).toEqual(["avatar"]);
  });

  it("documenta as rotas protegidas de profissionais, jornadas e administracao", () => {
    const { paths, components } = openApiDocument;
    expect(Object.keys(paths["/api/professionals/{id}"])).toEqual(["parameters", "get", "put", "delete"]);
    expect(paths["/api/professionals"].post.responses["201"].content["application/json"].schema.$ref)
      .toBe("#/components/schemas/ProfessionalResult");
    expect(paths["/api/professionals/{id}/work-days"].put.requestBody.content["application/json"].schema.$ref)
      .toBe("#/components/schemas/ProfessionalWorkDaysInput");
    expect(components.schemas.ProfessionalWorkDayInput.properties.breakStart.type).toEqual(["string", "null"]);
    const admin = [
      paths["/api/admin/users"].get,
      paths["/api/admin/users/{id}/role"].patch,
      paths["/api/admin/users/{id}/status"].patch,
      paths["/api/admin/users/{id}"].delete,
    ];
    for (const operation of admin) {
      expect(operation.security).toEqual([{ bearerAuth: [] }]);
      expect(operation.responses["403"].description).toContain("global admin");
    }
    expect(paths["/api/admin/users/{id}/status"].patch.responses["409"]).toBeDefined();
    expect(components.schemas.AdminUserStatusInput.properties.active).toEqual({ type: "boolean" });
    expect(components.schemas.AdminUser.properties).not.toHaveProperty("password");
  });
});
