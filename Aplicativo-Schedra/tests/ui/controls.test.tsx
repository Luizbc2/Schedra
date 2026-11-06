import { createRef, useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../../src/shared/components/ui/Button";
import { IconButton } from "../../src/shared/components/ui/IconButton";
import { FormField } from "../../src/shared/components/ui/FormField";
import { FeedbackState, InlineError } from "../../src/shared/components/ui/FeedbackState";
import { buttonTheme } from "../../src/shared/components/ui/button-theme";
import { darkColors, lightColors } from "../../src/theme/tokens";

describe("shared actions", () => {
  it("keeps the label and blocks repeated clicks while saving", async () => {
    const request = vi.fn();
    function SaveForm() {
      const [loading, setLoading] = useState(false);
      return <Button label="Salvar cliente" loading={loading} onPress={() => { setLoading(true); request(); }} />;
    }
    render(<SaveForm />);
    const button = screen.getByRole("button", { name: "Salvar cliente" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(request).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Salvar cliente")).toBeTruthy();
    await act(async () => {});
  });

  it("disables icon actions and exposes their accessible name", () => {
    const action = vi.fn();
    const { rerender } = render(<IconButton icon="trash-outline" accessibilityLabel="Excluir cliente" variant="destructive" disabled onPress={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir cliente" }));
    expect(action).not.toHaveBeenCalled();
    rerender(<IconButton icon="trash-outline" accessibilityLabel="Excluir cliente" variant="destructive" onPress={action} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir cliente" }));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not scale when reduced motion is enabled", async () => {
    render(<Button label="Continuar" />);
    const button = screen.getByRole("button", { name: "Continuar" });
    fireEvent.mouseEnter(button);
    await waitFor(() => expect(button.style.transform).toBe("scale(1)"));
  });

  it.each([darkColors, lightColors])("uses the theme for every variant", (colors) => {
    expect(buttonTheme(colors, "primary").background).toBe(colors.accent);
    expect(buttonTheme(colors, "secondary").foreground).toBe(colors.text);
    expect(buttonTheme(colors, "ghost").background).toBe("transparent");
    expect(buttonTheme(colors, "destructive").foreground).toBe(colors.danger);
  });
});

describe("form fields", () => {
  it("preserves the input node and focus after each typed character", () => {
    function Form() {
      const [value, setValue] = useState("");
      return <FormField label="Nome" value={value} onChangeText={setValue} />;
    }
    render(<Form />);
    const input = screen.getByRole("textbox", { name: "Nome" }) as HTMLInputElement;
    act(() => input.focus());
    for (const value of ["L", "Lu", "Lui", "Luiz"]) {
      fireEvent.change(input, { target: { value } });
      expect(screen.getByRole("textbox", { name: "Nome" })).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe(value);
    }
  });

  it("supports a ref, multiline and disabled fields", () => {
    const ref = createRef<any>();
    render(<FormField label="Notas" multiline ref={ref} editable={false} value="Observacao" />);
    const input = screen.getByRole("textbox", { name: "Notas" }) as HTMLTextAreaElement;
    expect(input.tagName).toBe("TEXTAREA");
    expect(input.readOnly).toBe(true);
    expect(ref.current).toBe(input);
  });

  it("toggles password visibility without changing its value", () => {
    render(<FormField label="Senha" secureTextEntry value="Senha@123" />);
    const input = screen.getByLabelText("Senha") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(input.type).toBe("text");
    expect(input.value).toBe("Senha@123");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(input.type).toBe("password");
  });

  it("prioritizes an accessible error over the helper text", () => {
    render(<FormField label="E-mail" helperText="Contato" error="E-mail invalido" />);
    expect(screen.getByRole("alert").textContent).toBe("E-mail invalido");
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText("Contato")).toBeNull();
  });
});

describe("feedback", () => {
  it("announces loading and does not offer a concurrent retry", () => {
    render(<FeedbackState kind="loading" title="Carregando clientes" action={{ label: "Tentar novamente", onPress: vi.fn() }} />);
    expect(screen.getByText("Carregando clientes")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("exposes retry on error", () => {
    const retry = vi.fn();
    render(<FeedbackState kind="error" title="Falha ao carregar" detail="Sem conexao" action={{ label: "Tentar novamente", onPress: retry }} />);
    expect(screen.getByRole("alert").textContent).toContain("Sem conexao");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("renders inline validation as an alert", () => {
    render(<InlineError message="Revise os dados" />);
    expect(screen.getByRole("alert").textContent).toContain("Revise os dados");
  });
});
