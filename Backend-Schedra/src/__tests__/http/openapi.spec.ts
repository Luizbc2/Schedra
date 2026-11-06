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
});
