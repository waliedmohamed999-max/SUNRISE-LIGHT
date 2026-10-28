import { api, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const POST = api(async () => {
  await destroySession();
  return ok({ ok: true });
});
