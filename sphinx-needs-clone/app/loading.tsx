export default function Loading() {
  return (
    <main className="flex flex-1 flex-col min-h-0">
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-background z-10 border-b border-border">
            <tr>
              {['ID', 'Type', 'Title', 'Status', 'Tags', 'Links'].map(col => (
                <th key={col} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-3 py-2"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                <td className="px-3 py-2"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                <td className="px-3 py-2"><div className="h-4 w-48 bg-muted rounded animate-pulse" /></td>
                <td className="px-3 py-2"><div className="h-4 w-14 bg-muted rounded animate-pulse" /></td>
                <td className="px-3 py-2"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                <td className="px-3 py-2"><div className="h-4 w-8 bg-muted rounded animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
