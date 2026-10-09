import test from "node:test";
import assert from "node:assert/strict";
import { getServiceForms, getFormDownloadUrl, isRequestFormFile } from "../lib/service-forms.ts";

test("only published services with attachments enter the public form library", () => {
  const form = { type: "service", status: "published", attachmentUrl: "/api/media/form" };
  assert.deepEqual(getServiceForms([form, {...form,status:"draft"}, {...form,type:"news"}, {...form,attachmentUrl:""}]), [form]);
});
test("download preserves an existing query string", () => {
  assert.equal(getFormDownloadUrl("/api/media/form"), "/api/media/form?download=1");
  assert.equal(getFormDownloadUrl("/api/media/form?version=2"), "/api/media/form?version=2&download=1");
});
test("form publication accepts office documents and excludes images and video", () => {
  for(const fileName of ["FORM.PDF","form.docx","form.xlsx","form.pptx"]) assert.equal(isRequestFormFile({fileName}),true);
  for(const fileName of ["portrait.jpg","movie.mp4"]) assert.equal(isRequestFormFile({fileName}),false);
});
