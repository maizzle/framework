import { caniemail, rawData } from 'caniemail'

export async function serveCompatibility(req: any, res: any) {
  try {
    const html = await new Promise<string>((resolve, reject) => {
      let body = ''
      req.on('data', (chunk: string) => { body += chunk })
      req.on('end', () => resolve(body))
      req.on('error', reject)
    })

    if (!html) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify([]))
      return
    }

    const result = caniemail({
      clients: ['apple-mail.*', 'gmail.*', 'outlook.*', 'yahoo.*'],
      html,
    })

    // Build title -> caniemail URL lookup
    const urlMap = new Map<string, string>()
    for (const item of (rawData as any).data) {
      urlMap.set(item.title, item.url)
    }

    const issues: Array<{ type: 'error' | 'warning', client: string, title: string, notes: string[], line?: number }> = []

    for (const [client, clientIssues] of result.issues.errors) {
      for (const issue of clientIssues) {
        issues.push({
          type: 'error',
          client,
          title: issue.title,
          notes: issue.notes,
          line: issue.position?.start.line,
        })
      }
    }

    for (const [client, clientIssues] of result.issues.warnings) {
      for (const issue of clientIssues) {
        issues.push({
          type: 'warning',
          client,
          title: issue.title,
          notes: issue.notes,
          line: issue.position?.start.line,
        })
      }
    }

    // Group by feature title + type, keep per-client notes
    const grouped = new Map<string, {
      type: 'error' | 'warning'
      title: string
      clients: Array<{ name: string, notes: string[] }>
      url?: string
      line?: number
    }>()

    for (const issue of issues) {
      const key = `${issue.type}:${issue.title}`
      const existing = grouped.get(key)
      const clientName = issue.client
        .split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

      if (existing) {
        const existingClient = existing.clients.find(c => c.name === clientName)
        if (existingClient) {
          for (const note of issue.notes) {
            if (!existingClient.notes.includes(note)) {
              existingClient.notes.push(note)
            }
          }
        } else {
          existing.clients.push({ name: clientName, notes: [...issue.notes] })
        }
      } else {
        grouped.set(key, {
          type: issue.type,
          title: issue.title,
          clients: [{ name: clientName, notes: [...issue.notes] }],
          url: urlMap.get(issue.title),
          line: issue.line,
        })
      }
    }

    // Sort: errors first, then warnings
    const sortedIssues = [...grouped.values()].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'error' ? -1 : 1
      return a.title.localeCompare(b.title)
    })

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(sortedIssues))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: error.message }))
  }
}
