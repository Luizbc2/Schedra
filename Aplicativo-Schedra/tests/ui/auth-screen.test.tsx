import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthScreen } from "../../src/features/auth/screens/AuthScreen";

const auth = vi.hoisted(() => ({ signIn: vi.fn().mockResolvedValue(undefined), signUp: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../src/features/auth/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("react-native-safe-area-context", async () => ({ SafeAreaView: (await import("react-native")).View }));

describe("auth screen shared controls", () => {
  it("submits the login through the shared button", async () => {
    render(<AuthScreen />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Teste@123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith({ email: "test@example.com", password: "Teste@123" }));
  });

  it("keeps the signup mask and password requirements when using FormField", async () => {
    render(<AuthScreen />);
    fireEvent.click(screen.getByRole("tab", { name: "Criar conta" }));
    const name = await screen.findByRole("textbox", { name: "Nome" });
    fireEvent.change(name, { target: { value: "Teste Local" } });
    const submit = screen.getByRole("button", { name: "Criar conta" });
    expect(submit.getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "52998224725" } });
    expect((screen.getByLabelText("CPF") as HTMLInputElement).value).toBe("529.982.247-25");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Teste@123" } });
    fireEvent.click(submit);
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({ name: "Teste Local", cpf: "52998224725", email: "test@example.com", password: "Teste@123" }));
  });
});
