'use client'

import Papa from 'papaparse'
import { useMemo, useState } from 'react'

import { rowsFromTable, TEMPLATE_CSV, type ImportResult, type ImportRow } from '@/lib/productImport'

import s from './import.module.css'

type TenantOption = { id: number; name: string; canCreate: boolean }
type Parsed = ReturnType<typeof rowsFromTable> & { fileName: string; duplicateIds: number }

const BATCH = 250

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function readTable(file: File): Promise<unknown[][]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser')
    return (await readSheet(file)) as unknown[][]
  }
  if (lower.endsWith('.xls')) throw new Error('Old .xls files are not supported. In Excel, use Save As and choose .xlsx or .csv.')
  return new Promise((resolve, reject) =>
    Papa.parse<unknown[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (r) => resolve(r.data),
      error: (e) => reject(e),
    }),
  )
}

export default function ImportClient({
  tenants,
  initialTenant,
  apiRoute,
}: {
  tenants: TenantOption[]
  initialTenant: number | null
  apiRoute: string
}) {
  const [tenantId, setTenantId] = useState<number | null>(initialTenant)
  const tenant = tenants.find((t) => t.id === tenantId) ?? null
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [allowCreate, setAllowCreate] = useState(true)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)
  const [fileKey, setFileKey] = useState(0)

  const canCreate = Boolean(tenant?.canCreate)
  const busy = progress !== null && result === null && fatal === null

  const onFile = async (file: File | undefined) => {
    setParsed(null)
    setParseError(null)
    setResult(null)
    setFatal(null)
    setProgress(null)
    if (!file) return
    try {
      const table = await readTable(file)
      const out = rowsFromTable(table)
      // A repeated ID would make the two rows overwrite each other on every import, so only the
      // first row with each ID is sent. IDs are compared exactly (capital letters count).
      const firstLine = new Map<string, number>()
      const rows = out.rows.filter((r) => {
        if (!r.code) return true
        const first = firstLine.get(r.code)
        if (first === undefined) {
          firstLine.set(r.code, r.line)
          return true
        }
        out.problems.push({ line: r.line, reason: `ID "${r.code}" was already used on line ${first}; this row is not imported` })
        return false
      })
      const duplicateIds = out.rows.length - rows.length
      out.rows = rows
      out.problems.sort((a, b) => a.line - b.line)
      setParsed({ ...out, fileName: file.name, duplicateIds })
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'This file could not be read.')
    }
  }

  const start = async () => {
    if (!parsed || !tenant) return
    const rows = parsed.rows
    const total: ImportResult = { created: 0, updated: 0, unchanged: 0, skipped: [], failed: [] }
    setResult(null)
    setFatal(null)
    setProgress({ done: 0, total: rows.length })
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch: ImportRow[] = rows.slice(i, i + BATCH)
      let res: Response
      try {
        res = await fetch(`${apiRoute}/products/import`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: tenant.id, rows: batch, columns: parsed.foundKeys, allowCreate: canCreate && allowCreate }),
        })
      } catch {
        setFatal(`The connection dropped after ${i} rows. Run the same file again: rows already imported are recognised by their ID and skipped as unchanged.`)
        return
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFatal(`${body.error ?? `The server answered ${res.status}.`} ${i ? `${i} rows were imported before this.` : ''}`)
        return
      }
      total.created += body.created
      total.updated += body.updated
      total.unchanged += body.unchanged
      total.skipped.push(...body.skipped)
      total.failed.push(...body.failed)
      setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length })
    }
    setResult(total)
  }

  const reset = () => {
    setParsed(null)
    setResult(null)
    setFatal(null)
    setProgress(null)
    setFileKey((k) => k + 1)
  }

  const report = useMemo(() => {
    if (!result) return null
    const lines = [...parsed!.problems.map((p) => ({ line: p.line, name: '', reason: p.reason, status: 'Not read' })),
      ...result.skipped.map((r) => ({ ...r, status: 'Skipped' })),
      ...result.failed.map((r) => ({ ...r, status: 'Failed' }))]
    if (!lines.length) return null
    return Papa.unparse(lines.sort((a, b) => a.line - b.line).map((l) => ({ Line: l.line, Status: l.status, Name: l.name, Reason: l.reason })))
  }, [result, parsed])

  if (!tenants.length)
    return (
      <div className={s.page}>
        <h1 className={s.title}>Import products</h1>
        <p className={s.error}>Your account is not linked to any tenant yet. Ask a Portal Super Owner to add you.</p>
      </div>
    )

  const nameMissing = parsed?.missingColumns.includes('Name')
  const preview = parsed?.rows.slice(0, 8) ?? []

  return (
    <div className={s.page}>
      <h1 className={s.title}>Import products</h1>
      <p className={s.lead}>
        Upload a CSV or Excel (.xlsx) file with the columns <b>id, Name, Salt, Company, Packing, MRP, Category, visibility, Division, newArrivals</b>.
        Optional extra columns: <b>Form, In Box, Shipper, Price</b>. Products are matched by <b>id</b>: existing ones are updated, new ones are added. Only the columns in your file are changed, and products not in the file are left as they are.{' '}
        <button type="button" className={s.link} onClick={() => download('products-template.csv', TEMPLATE_CSV)}>
          Download a template
        </button>
      </p>

      <section className={s.card}>
        <h2 className={s.cardTitle}>1. Choose the site and file</h2>
        <div className={s.row}>
          <div>
            <label className={s.label} htmlFor="imp-tenant">
              Tenant
            </label>
            <select
              id="imp-tenant"
              className={s.select}
              value={tenantId ?? ''}
              disabled={busy}
              onChange={(e) => setTenantId(Number(e.target.value))}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={s.label} htmlFor="imp-file">
              File
            </label>
            <input
              key={fileKey}
              id="imp-file"
              className={s.file}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        </div>
        {tenant && !canCreate && (
          <p className={s.note}>As a Tenant Editor you can update existing products only. Products in the file that are not on the site yet will be skipped.</p>
        )}
        {parseError && <p className={s.error}>{parseError}</p>}
      </section>

      {parsed && (
        <section className={s.card}>
          <h2 className={s.cardTitle}>2. Check the file</h2>
          <p>
            <b>{parsed.fileName}</b>: {parsed.rows.length.toLocaleString('en-IN')} products found
            {parsed.problems.length > 0 && <>, {parsed.problems.length} rows with problems</>}
            {parsed.duplicateIds > 0 && <>, {parsed.duplicateIds} rows repeat an ID used earlier (only the first is imported)</>}.
          </p>
          <div className={s.pills}>
            {parsed.foundColumns.map((c) => (
              <span key={c} className={s.pillOk}>
                ✓ {c}
              </span>
            ))}
            {parsed.missingColumns.map((c) => (
              <span key={c} className={s.pillMissing}>
                no {c}
              </span>
            ))}
          </div>
          {nameMissing && <p className={s.error}>The file needs a Name column. Check the first row holds the column names.</p>}
          {!nameMissing && !parsed.foundColumns.includes('id') && (
            <p className={s.note}>There is no id column, so products are matched by exact name. Products with the same name may be added twice.</p>
          )}
          {parsed.problems.length > 0 && (
            <ul className={s.list}>
              {parsed.problems.slice(0, 10).map((p) => (
                <li key={`${p.line}-${p.reason}`}>
                  Line {p.line}: {p.reason}
                </li>
              ))}
              {parsed.problems.length > 10 && <li>…and {parsed.problems.length - 10} more (in the report after importing)</li>}
            </ul>
          )}
          {preview.length > 0 && (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    {['id', 'Name', 'Salt', 'Company', 'Packing', 'Form', 'In Box', 'Shipper', 'MRP', 'Price', 'Category', 'Division', 'Visible', 'New'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.line}>
                      <td>{r.code}</td>
                      <td title={r.name}>{r.name}</td>
                      <td title={r.salt ?? ''}>{r.salt}</td>
                      <td>{r.company}</td>
                      <td>{r.packing}</td>
                      <td>{r.form}</td>
                      <td>{r.inBox}</td>
                      <td>{r.shipper}</td>
                      <td>{r.mrp ?? ''}</td>
                      <td>{r.price ?? ''}</td>
                      <td>{r.category}</td>
                      <td>{r.division}</td>
                      <td>{r.visible ? 'Yes' : 'No'}</td>
                      <td>{r.newArrival ? 'Yes' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > preview.length && <p className={s.muted}>Showing the first {preview.length} rows.</p>}
            </div>
          )}
        </section>
      )}

      {parsed && !nameMissing && parsed.rows.length > 0 && (
        <section className={s.card}>
          <h2 className={s.cardTitle}>3. Import</h2>
          <label className={s.row} style={{ gap: 8, marginBottom: 14 }}>
            <input type="checkbox" checked={canCreate && allowCreate} disabled={!canCreate || busy} onChange={(e) => setAllowCreate(e.target.checked)} />
            Add products that are not on the site yet {!canCreate && <span className={s.muted}>(Tenant Super Owners only)</span>}
          </label>
          {!progress && (
            <button type="button" className={s.btn} disabled={!tenant} onClick={start}>
              Import {parsed.rows.length.toLocaleString('en-IN')} products into {tenant?.name}
            </button>
          )}
          {progress && (
            <div role="status" aria-live="polite">
              <div className={s.bar}>
                <div className={s.barFill} style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
              </div>
              <p className={s.muted}>
                {result ? 'Finished' : 'Importing'}: {progress.done.toLocaleString('en-IN')} of {progress.total.toLocaleString('en-IN')} rows
                {busy && '. Keep this page open until it finishes.'}
              </p>
            </div>
          )}
          {fatal && <p className={s.error}>{fatal}</p>}
        </section>
      )}

      {result && (
        <section className={s.card}>
          <h2 className={s.cardTitle}>Done</h2>
          <div className={s.stats}>
            {([
              ['Added', result.created],
              ['Updated', result.updated],
              ['Unchanged', result.unchanged],
              ['Skipped', result.skipped.length + (parsed?.problems.filter((p) => p.reason === 'No product name').length ?? 0)],
              ['Failed', result.failed.length],
            ] as const).map(([label, n]) => (
              <div key={label} className={s.stat}>
                <div className={`${s.statNum} ${label === 'Failed' && n ? '' : label === 'Added' || label === 'Updated' ? s.ok : ''}`}>{n.toLocaleString('en-IN')}</div>
                <div className={s.muted}>{label}</div>
              </div>
            ))}
          </div>
          {[...result.failed, ...result.skipped].length > 0 && (
            <ul className={s.list}>
              {[...result.failed.map((r) => ({ ...r, kind: 'Failed' })), ...result.skipped.map((r) => ({ ...r, kind: 'Skipped' }))]
                .slice(0, 50)
                .map((r) => (
                  <li key={`${r.kind}-${r.line}`}>
                    Line {r.line} {r.name && `(${r.name})`}: {r.kind.toLowerCase()}, {r.reason}
                  </li>
                ))}
            </ul>
          )}
          <div className={s.row} style={{ marginTop: 16 }}>
            {report && (
              <button type="button" className={s.btnGhost} onClick={() => download('import-report.csv', report)}>
                Download report
              </button>
            )}
            <button type="button" className={s.btnGhost} onClick={reset}>
              Import another file
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
