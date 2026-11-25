export function apiSnippets(input: { origin: string; apiKey: string; templateId: string; from: string }) {
  const payload = {
    to: "reader@example.com",
    from: input.from,
    subject: "Hello from the API",
    templateId: input.templateId,
    variables: { first_name: "Anna" },
    category: "transactional",
  }
  const pretty = JSON.stringify(payload, null, 2)
  const compact = JSON.stringify(payload)
  const curl = `curl -X POST ${input.origin}/api/v1/send \\
  -H "Authorization: Bearer ${input.apiKey}" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '${compact}'`
  const node = `const response = await fetch("${input.origin}/api/v1/send", {
  method: "POST",
  headers: {
    Authorization: "Bearer ${input.apiKey}",
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify(${pretty}),
});
const data = await response.json();`
  const python = `import json, urllib.request, uuid
payload = json.loads(${JSON.stringify(compact)})
request = urllib.request.Request(
    "${input.origin}/api/v1/send",
    data=json.dumps(payload).encode(),
    headers={
        "Authorization": "Bearer ${input.apiKey}",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4()),
    },
    method="POST",
)
print(urllib.request.urlopen(request).read().decode())`
  return { curl, node, python }
}
