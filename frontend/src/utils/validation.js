// Shared field-level validators, used generically by DynamicField.vue so a
// rule like "phone numbers are 10 digits" is written once and reused by
// every doctype's phone_no/phone_number field, instead of copy-pasted or
// reimplemented per form. Each validator takes a raw value and returns an
// error string, or '' when the value is valid - empty/unset is always
// treated as valid here (a field being required at all is a separate,
// existing concern handled by `field.reqd`/FormControl's own `required`
// prop).

export function validatePhoneNumber(value) {
  if (!value) return ''
  if (!/^\d+$/.test(value)) return 'Phone number can only contain digits.'
  if (value.length !== 10) return 'Phone number must be exactly 10 digits.'
  return ''
}

export function validateEmail(value) {
  if (!value) return ''
  // Deliberately simple (not RFC 5322) - this only needs to catch obvious
  // typos ("missing @", "missing domain"), not exhaustively validate every
  // technically-legal address; anything stricter risks rejecting real
  // addresses users actually have.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.'
  return ''
}

export function validateNotFutureDate(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date > today) return 'Date cannot be in the future.'
  return ''
}

// Maps a field to its validator purely by naming convention - e.g.
// phone_no/phone_number/mobile_no all mean "this is a phone number" the
// same way across doctypes. Doctype JSON stays the source of truth for
// fieldtype/options/reqd - this only adds the extra format check neither
// Frappe's Data fieldtype nor a plain HTML input expresses on its own.
const FIELDNAME_PATTERNS = [
  { pattern: /(^|_)(phone|mobile)(_no|_number)?$/i, validator: validatePhoneNumber },
  { pattern: /(^|_)email$/i, validator: validateEmail },
]

export function getValidatorForField(field) {
  if (field.fieldtype === 'Date' && /(^|_)(date_of_birth|dob)$/i.test(field.fieldname)) {
    return validateNotFutureDate
  }
  if (field.fieldtype !== 'Data') return null
  const match = FIELDNAME_PATTERNS.find((p) => p.pattern.test(field.fieldname))
  return match?.validator || null
}
