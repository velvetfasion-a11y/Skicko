import { prisma } from "@/lib/prisma"
import { originFromRequest } from "@/lib/origin"

export async function GET(req: Request, context: { params: Promise<{ formId: string }> }) {
  const { formId } = await context.params
  const form = await prisma.signupForm.findUnique({ where: { id: formId } })
  const origin = originFromRequest(req)
  const src = form ? `${origin}/f/${form.id}` : ""
  const body = `(() => {
    var current = document.currentScript;
    if (!current || !${JSON.stringify(src)}) return;
    var frame = document.createElement("iframe");
    frame.src = ${JSON.stringify(src)};
    frame.title = "Subscribe";
    frame.style.cssText = "width:100%;max-width:420px;height:560px;border:0;border-radius:24px;background:transparent;";
    current.parentNode && current.parentNode.insertBefore(frame, current);
  })();`
  return new Response(body, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  })
}
