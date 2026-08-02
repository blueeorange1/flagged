const SESSION_KEY = 'flagged.session_id'
const LOG_KEY = 'flagged.events'
const MAX_EVENTS = 500

function sessionId() {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

// TODO(backend): send to Supabase here. This is the only function that
// touches storage, so wiring the backend is a one-file change.
export function logEvent({
  incident_type,
  tactic,
  truth_type,
  decision,
  correct,
  ms_to_decide,
  evidence_windows_opened,
  questioned_sender,
  obeyed_authority,
  day,
}) {
  const event = {
    session_id: sessionId(),
    ts: Date.now(),
    incident_type,
    tactic,
    truth_type,
    decision,
    correct,
    ms_to_decide,
    evidence_windows_opened,
    questioned_sender,
    obeyed_authority,
    day,
  }

  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
    log.push(event)
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_EVENTS)))
  } catch {
    localStorage.setItem(LOG_KEY, JSON.stringify([event]))
  }

  return event
}

export function readEvents() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearEvents() {
  localStorage.removeItem(LOG_KEY)
}
