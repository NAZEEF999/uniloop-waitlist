import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react'
import { TextField, SelectField, FieldError } from '../ui/Field'
import { Button } from '../ui/Button'
import { INTERESTS, UNIVERSITIES, USE_OPTIONS, universityLabel } from '../../lib/constants'
import { PHONE_ERROR, parsePhone } from '../../lib/phone'
import { scrollToTop } from '../../lib/scroll'
import { WaitlistError, submitWaitlistEntry } from '../../services/waitlistService'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const initialValues = {
  fullName: '', email: '', university: '', intendedUse: '',
  interests: [], whatsapp: '', emailConsent: false,
  website: '', // honeypot: hidden from people, bots tend to fill it
}

const validators = {
  fullName: (v) => {
    const t = v.fullName.trim()
    if (!t) return 'Enter your full name.'
    if (t.length < 2) return 'Your name looks too short. Please enter your full name.'
    return ''
  },
  email: (v) => {
    const t = v.email.trim()
    if (!t) return 'Enter your email address.'
    if (!EMAIL_RE.test(t)) return 'Enter a valid email address, like name@example.com.'
    return ''
  },
  university: (v) => (v.university ? '' : 'Select your university.'),
  intendedUse: (v) => (v.intendedUse ? '' : 'Choose how you plan to use Uniloop.'),
  whatsapp: (v) => (parsePhone(v.whatsapp).valid ? '' : PHONE_ERROR),
}

const validateAll = (values) => {
  const errors = {}
  for (const [key, fn] of Object.entries(validators)) {
    const msg = fn(values)
    if (msg) errors[key] = msg
  }
  return errors
}

const choiceBase =
  'flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-medium text-navy transition hover:bg-softWhite has-checked:border-navy has-checked:bg-green/25 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy'

export function WaitlistForm() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [submittedUniversity, setSubmittedUniversity] = useState('')
  const [outcome, setOutcome] = useState('registered') // registered | already_registered
  const [errorMessage, setErrorMessage] = useState('')
  const formRef = useRef(null)
  const successRef = useRef(null)
  const [attempt, setAttempt] = useState(0)

  const submitting = status === 'submitting'

  // Move focus to the first invalid field after a failed submit attempt.
  useEffect(() => {
    if (attempt > 0) formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [attempt])

  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
  }, [status])

  const setField = (name, value) => {
    const next = { ...values, [name]: value }
    setValues(next)
    if (errors[name] && validators[name]) {
      setErrors((e) => ({ ...e, [name]: validators[name](next) }))
    }
  }

  const blurValidate = (name) => () => {
    if (validators[name]) setErrors((e) => ({ ...e, [name]: validators[name](values) }))
  }

  const toggleInterest = (value) => {
    setField(
      'interests',
      values.interests.includes(value)
        ? values.interests.filter((i) => i !== value)
        : [...values.interests, value],
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const found = validateAll(values)
    setErrors(found)
    if (Object.keys(found).length) {
      setStatus('idle')
      setAttempt((n) => n + 1)
      return
    }

    setStatus('submitting')
    setErrorMessage('')
    try {
      const result = await submitWaitlistEntry({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        university: values.university,
        intendedUse: values.intendedUse,
        interests: values.interests,
        whatsapp: values.whatsapp.trim(),
        emailConsent: values.emailConsent,
        website: values.website,
      })
      // Reached ONLY when the server confirmed the sign-up was saved (or already existed).
      setOutcome(result.status)
      setSubmittedUniversity(values.university)
      setStatus('success')
      setValues(initialValues) // clear personal data from component state
    } catch (err) {
      if (err instanceof WaitlistError && err.kind === 'validation' && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors)
        setStatus('idle')
        setAttempt((n) => n + 1)
        return
      }
      setErrorMessage(err instanceof WaitlistError ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="py-4 text-center outline-none">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green/40 text-navy">
          <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-2xl font-extrabold text-navy">
          {outcome === 'already_registered' ? 'You’re already on the list!' : 'You’re on the list!'}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-navy/80">
          {outcome === 'already_registered'
            ? 'This email address is already registered for the Uniloop waitlist, so there’s nothing more you need to do. We’ll be in touch as we get closer to launch.'
            : 'Thank you for your interest in Uniloop. We’re excited to have you join our upcoming community.'}
        </p>
        {submittedUniversity && outcome === 'registered' && (
          <p className="mt-4 inline-block rounded-full bg-softWhite px-4 py-1.5 text-sm font-semibold text-navy">
            {universityLabel(submittedUniversity)}
          </p>
        )}
        <Button className="mt-8" variant="secondary" onClick={() => { setStatus('idle'); scrollToTop() }}>
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={submitting} className="space-y-6">
      {status === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">We couldn’t add you to the waitlist.</p>
            <p>{errorMessage || 'Something went wrong. Please try again.'}</p>
          </div>
        </div>
      )}

      {/* Honeypot: invisible to people and screen readers; bots fill it, the server then discards the sign-up. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input
            type="text" name="hp_field" tabIndex={-1} autoComplete="off"
            value={values.website} onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))}
          />
        </label>
      </div>

      <TextField
        label="Full Name" required autoComplete="name"
        value={values.fullName} error={errors.fullName} disabled={submitting}
        onChange={(e) => setField('fullName', e.target.value)} onBlur={blurValidate('fullName')}
        placeholder="e.g. Ada Okafor"
      />

      <TextField
        label="Email Address" required type="email" inputMode="email" autoComplete="email"
        value={values.email} error={errors.email} disabled={submitting}
        onChange={(e) => setField('email', e.target.value)} onBlur={blurValidate('email')}
        placeholder="you@example.com"
      />

      <SelectField
        label="University" required
        value={values.university} error={errors.university} disabled={submitting}
        onChange={(e) => setField('university', e.target.value)} onBlur={blurValidate('university')}
      >
        <option value="">Select your university</option>
        {UNIVERSITIES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
      </SelectField>

      <fieldset aria-describedby={errors.intendedUse ? 'use-error' : undefined}>
        <legend className="mb-2 text-sm font-semibold text-navy">
          How do you plan to use Uniloop?<span aria-hidden="true" className="text-red-700"> *</span>
        </legend>
        <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2">
          {USE_OPTIONS.map((o) => (
            <label key={o.value} className={`${choiceBase} ${errors.intendedUse ? 'border-red-600' : 'border-navy/20'}`}>
              <input
                type="radio" name="intendedUse" value={o.value}
                checked={values.intendedUse === o.value} disabled={submitting}
                aria-invalid={errors.intendedUse ? true : undefined}
                onChange={() => setField('intendedUse', o.value)}
                className="h-4 w-4 accent-navy"
              />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError id="use-error">{errors.intendedUse}</FieldError>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-navy">
          Product interests <span className="font-normal text-navy/60">(optional)</span>
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {INTERESTS.map((i) => (
            <label key={i.value} className={`${choiceBase} border-navy/20`}>
              <input
                type="checkbox" value={i.value}
                checked={values.interests.includes(i.value)} disabled={submitting}
                onChange={() => toggleInterest(i.value)}
                className="h-4 w-4 rounded accent-navy"
              />
              {i.label}
            </label>
          ))}
        </div>
      </fieldset>

      <TextField
        label="WhatsApp number" optional type="tel" inputMode="tel" autoComplete="tel"
        value={values.whatsapp} error={errors.whatsapp} disabled={submitting}
        onChange={(e) => setField('whatsapp', e.target.value)} onBlur={blurValidate('whatsapp')}
        placeholder="08012345678"
        hint="Add this if you’d like to be reachable on WhatsApp."
      />

      <label className="flex cursor-pointer items-start gap-3 text-sm text-navy">
        <input
          type="checkbox" checked={values.emailConsent} disabled={submitting}
          onChange={(e) => setField('emailConsent', e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded accent-navy"
        />
        <span>I agree to receive Uniloop launch updates by email.</span>
      </label>

      <div>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Joining…' : 'Join the Waitlist'}
        </Button>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-navy/60">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Your information will be used to manage the Uniloop waitlist and to contact you according to
            your communication preferences.
          </span>
        </p>
      </div>
    </form>
  )
}
