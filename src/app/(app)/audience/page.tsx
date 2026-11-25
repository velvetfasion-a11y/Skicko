import { requireUser } from "@/lib/auth"
import { loadAudience } from "@/lib/data"
import { requestOrigin } from "@/lib/origin"
import { AudienceView } from "@/components/audience/audience-view"

export const instant = false

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string; import?: string }>
}) {
  const session = await requireUser()
  const params = await searchParams
  const [data, origin] = await Promise.all([loadAudience(session.workspace.id), requestOrigin()])
  return (
    <AudienceView
      data={data}
      origin={origin}
      initialContact={params.contact}
      openImport={params.import === "1"}
    />
  )
}
