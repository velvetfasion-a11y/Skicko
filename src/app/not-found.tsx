export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-2xl font-semibold">That page is not here.</h1>
        <a href="/overview" className="mt-4 inline-block text-sm text-primary">Back to overview</a>
      </div>
    </main>
  )
}
