import assert from "node:assert/strict";
import { test } from "node:test";
import { invitationCopy, invitationLanguages, resolveInvitationLanguage, formatInvitationCopy, invitationDate, invitationStatus } from "../lib/invitationLanguage.ts";

test("sender language wins over browser language, including regional tags", () => {
  assert.equal(resolveInvitationLanguage("es", "en-US"), "es");
  assert.equal(resolveInvitationLanguage("da-DK", "es"), "da");
  assert.equal(resolveInvitationLanguage(["fr", "de"], "en"), "fr");
});
test("legacy links negotiate browser language and safely default", () => {
  assert.equal(resolveInvitationLanguage(null, "en;q=0.2,es-ES;q=0.9"), "es");
  assert.equal(resolveInvitationLanguage("invalid", "de;q=0,pt-BR;q=0.8"), "pt");
  assert.equal(resolveInvitationLanguage(null, "ja"), "en");
});
test("every language has complete copy, statuses and matching placeholders", () => {
  for (const language of invitationLanguages) {
    assert.deepEqual(Object.keys(invitationCopy[language]), Object.keys(invitationCopy.en));
    for (const key of Object.keys(invitationCopy.en)) {
      assert.ok(invitationCopy[language][key]);
      assert.deepEqual(invitationCopy[language][key].match(/\{\w+\}/g), invitationCopy.en[key].match(/\{\w+\}/g));
    }
    for (const status of ["expired", "revoked", "exhausted", "closed"]) assert.ok(invitationStatus[language][status]);
  }
});
test("Spanish invitation copy and dates are localized without changing user text", () => {
  assert.equal(invitationCopy.es.open, "Abre GreenLoop para unirte");
  assert.equal(formatInvitationCopy(invitationCopy.es.body, "title", "$& Costa"), "Únete a «$& Costa» y reciclemos juntos.");
  assert.equal(invitationDate("2026-10-24T00:00:00Z", "es"), "24/10/2026");
});
