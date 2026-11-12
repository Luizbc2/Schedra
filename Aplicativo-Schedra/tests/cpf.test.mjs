import assert from "node:assert/strict";
import test from "node:test";

import { formatCpf, normalizeCpf, validateCpf } from "../src/features/auth/cpf.ts";

test("formata o CPF progressivamente", () => {
  assert.equal(formatCpf("529982"), "529.982");
  assert.equal(formatCpf("52998224725"), "529.982.247-25");
});

test("normaliza o CPF antes de enviar", () => {
  assert.equal(normalizeCpf("529.982.247-25"), "52998224725");
});

test("valida os dígitos verificadores", () => {
  assert.equal(validateCpf("529.982.247-25"), true);
  assert.equal(validateCpf("111.111.111-11"), false);
  assert.equal(validateCpf("123.456.789-00"), false);
});
