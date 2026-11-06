import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarFile } from "../src/features/profile/api/avatar-file.ts";
for (const [mime, extension] of [["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]) {
  test(`nome de avatar corresponde a ${mime}`, () => {
    const file = avatarFile("file:///foto",mime);
    assert.ok(file.name.endsWith(`.${extension}`));
    assert.equal(file.type,mime);
  });
}
test("não disfarça formato incompatível como JPG", () => {
  assert.throws(()=>avatarFile("file:///foto.heic","image/heic"));
  assert.equal(avatarFile("file:///foto.PNG").type,"image/png");
});
