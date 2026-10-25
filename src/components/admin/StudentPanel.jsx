import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Mail, MessageCircle, StickyNote } from 'lucide-react'
import { Drawer } from '../ui/Drawer'
import { SelectField, TextAreaField } from '../ui/Field'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { STATUSES, intendedUseLabel, interestLabel, statusLabel, universityLabel } from '../../lib/constants'
import { formatDateTime } from '../../lib/format'
import { getWaitlistRecord, updateNotes, updateStatus } from '../../services/adminWaitlistService'
import { useApiErrorHandler } from '../../hooks/useApiErrorHandler'
import { mailtoHref, whatsappHref } from './contactLinks'

const NOTES_MAX = 5000

function Row({ label, children }) {
  return (
    <div className="grid gap-0.5 py-3 sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-navy/60">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-navy">{children}</dd>
    </div>
  )
}

const linkBtn =
  'inline-flex h-10 items-center gap-2 rounded-full border border-navy/20 px-4 text-sm font-semibold text-navy hover:bg-navy/5'

// Mounted only once the full record has loaded, so its draft starts from the saved value.
function NotesEditor({ record, onSaved }) {
  const handleError = useApiErrorHandler()
  const [draft, setDraft] = useState(record.notes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const dirty = draft.trim() !== record.notes.trim()
  const tooLong = draft.length > NOTES_MAX

  const save = async (e) => {
    e.preventDefault()
    if (!dirty || tooLong || saving) return
    setSaving(true); setError(''); setJustSaved(false)
    try {
      const updated = await updateNotes(record.id, draft)
      onSaved(updated)
      setDraft(updated.notes) // show exactly what the database now holds
      setJustSaved(true)
    } catch (err) {
      const msg = handleError(err)
      if (msg) setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3" noValidate>
      <TextAreaField
        label="Internal notes" labelHidden rows={5} disabled={saving}
        placeholder="Add follow-up notes about this student…"
        value={draft}
        error={tooLong ? `Notes can be at most ${NOTES_MAX.toLocaleString()} characters.` : ''}
        onChange={(e) => { setDraft(e.target.value); setJustSaved(false); if (error) setError('') }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="dark" size="sm" loading={saving} disabled={!dirty || tooLong}>
          {saving ? 'Saving…' : 'Save notes'}
        </Button>
        <span className="text-xs text-navy/60">{draft.length.toLocaleString()} / {NOTES_MAX.toLocaleString()}</span>
        {justSaved && !dirty && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-greenDark">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </form>
  )
}

export function StudentPanel({ row, onClose, onRecordChange }) {
  const handleError = useApiErrorHandler()
  const [detail, setDetail] = useState({ state: 'loading', record: null, message: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState('')

  // Retrieve the full, authorized record fresh from the database when the panel opens.
  useEffect(() => {
    let cancelled = false
    getWaitlistRecord(row.id)
      .then((record) => { if (!cancelled) setDetail({ state: 'ready', record, message: '' }) })
      .catch((err) => { if (!cancelled) setDetail({ state: 'error', record: null, message: handleError(err) }) })
    return () => { cancelled = true }
  }, [row.id, reloadKey, handleError])

  const full = detail.record
  const record = full ?? row // list data is enough for the top section while the rest loads
  const wa = whatsappHref(record)

  const changeStatus = async (e) => {
    const next = e.target.value
    setStatusSaving(true); setStatusError('')
    try {
      // The UI changes only after the database confirms the write; on failure the select
      // simply keeps showing the last saved value.
      const updated = await updateStatus(record.id, next)
      setDetail((d) => (d.record ? { ...d, record: { ...d.record, status: updated.status, updatedAt: updated.updatedAt } } : d))
      onRecordChange({ id: record.id, status: updated.status })
    } catch (err) {
      const msg = handleError(err)
      if (msg) setStatusError(`Couldn’t update the status. ${msg}`)
    } finally {
      setStatusSaving(false)
    }
  }

  const onNotesSaved = (updated) =>
    setDetail((d) => (d.record ? { ...d, record: { ...d.record, notes: updated.notes, updatedAt: updated.updatedAt } } : d))

  return (
    <Drawer title="Student details" onClose={onClose} widthClass="sm:max-w-lg">
      <div className="space-y-6 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-extrabold text-navy">{record.fullName}</h3>
            <StatusBadge status={record.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={mailtoHref(record)} className={linkBtn}><Mail className="h-4 w-4" aria-hidden="true" /> Email</a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>

        {detail.state === 'error' && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{detail.message || 'Couldn’t load the full record.'}</span>
            <Button size="sm" variant="secondary" onClick={() => { setDetail({ state: 'loading', record: null, message: '' }); setReloadKey((k) => k + 1) }}>Try again</Button>
          </div>
        )}

        <dl className="divide-y divide-navy/10 rounded-2xl border border-navy/10 px-4" aria-busy={detail.state === 'loading'}>
          <Row label="Email">
            <a href={mailtoHref(record)} className="text-greenDark underline-offset-2 hover:underline">{record.email}</a>
          </Row>
          <Row label="WhatsApp">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="text-greenDark underline-offset-2 hover:underline">{record.whatsapp}</a>
            ) : (
              <span className="text-navy/60">Not provided</span>
            )}
          </Row>
          <Row label="University">{universityLabel(record.university)}</Row>
          <Row label="Intended use">{intendedUseLabel(record.intendedUse)}</Row>
          <Row label="Product interests">
            {!full ? <span className="text-navy/60">{detail.state === 'loading' ? 'Loading…' : '–'}</span>
              : full.interests.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {full.interests.map((i) => (
                    <li key={i} className="rounded-full bg-softWhite px-2.5 py-1 text-xs font-medium">{interestLabel(i)}</li>
                  ))}
                </ul>
              ) : <span className="text-navy/60">None selected</span>}
          </Row>
          <Row label="Email consent">
            {!full ? <span className="text-navy/60">{detail.state === 'loading' ? 'Loading…' : '–'}</span>
              : full.emailConsent
                ? `Agreed to receive launch updates by email${full.consentRecordedAt ? ` (${formatDateTime(full.consentRecordedAt)})` : ''}`
                : 'Has not agreed to email updates'}
          </Row>
          <Row label="Date joined">{formatDateTime(record.joinedAt)}</Row>
        </dl>

        <div>
          <SelectField
            label="Follow-up status" size="sm"
            value={record.status} disabled={statusSaving || detail.state !== 'ready'}
            onChange={changeStatus}
            hint={statusSaving ? 'Saving…' : 'Changes are saved immediately.'}
            error={statusError}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </SelectField>
        </div>

        <section aria-labelledby="notes-heading">
          <h4 id="notes-heading" className="flex items-center gap-2 text-base font-bold text-navy">
            <StickyNote className="h-4 w-4" aria-hidden="true" /> Internal notes
          </h4>
          <p className="mt-1 text-xs text-navy/60">Private to the Uniloop team. Never shown to students.</p>
          {detail.state === 'ready' && <NotesEditor key={full.id} record={full} onSaved={onNotesSaved} />}
          {detail.state === 'loading' && (
            <p role="status" className="mt-4 flex items-center gap-2 text-sm text-navy/70">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading notes…
            </p>
          )}
          {full?.updatedAt && <p className="mt-3 text-xs text-navy/50">Last updated {formatDateTime(full.updatedAt)}</p>}
        </section>
      </div>
    </Drawer>
  )
}
