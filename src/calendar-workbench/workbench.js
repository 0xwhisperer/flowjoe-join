/**
 * Calendar Workbench island controller (FullCalendar Standard MIT proof; shipped — the app
 * opens this page in the preview modal/fullscreen host).
 *
 * Runs INSIDE the workbench iframe. Owns the FullCalendar lifecycle and speaks to the parent
 * exclusively via postMessage, mirroring the spreadsheet/rich-document islands:
 *
 *   island -> parent : { type: "flowjoe:calendar-ready" }                  (bundles loaded, awaiting a snapshot)
 *   parent -> island : { type: "flowjoe:calendar-load", snapshot }         (mount + load this calendar)
 *   island -> parent : { type: "flowjoe:calendar-loaded" }                 (calendar rendered)
 *   parent -> island : { type: "flowjoe:calendar-request-save" }           (e.g. on modal close)
 *   island -> parent : { type: "flowjoe:calendar-save", snapshot }         (debounced on edit, or on request)
 *   parent -> island : { type: "flowjoe:calendar-dispose" }                (teardown)
 *   island -> parent : { type: "flowjoe:calendar-error", message, phase }  (init/load/save failure)
 *
 * SNAPSHOT OWNERSHIP (Phase 0 gate): a save returns a FlowJoe-owned snapshot, NOT FullCalendar
 * private UI state. The island echoes the envelope it was loaded with (schema/version/engine/
 * title/timezone/defaultView) and swaps in a fresh `events` array built from normalized
 * FullCalendar event fields (id/title/start/end/allDay/+a few extendedProps). View state,
 * scroll position, current date range, hover/selection, and FullCalendar internals are NOT
 * serialized — proving the stored snapshot is FlowJoe's, not the engine's.
 */
(function () {
  "use strict";

  const SAVE_DEBOUNCE_MS = 600;
  const SNAPSHOT_SCHEMA = "flowjoe.calendar.snapshot";
  const SNAPSHOT_VERSION = 1;

  let calendar = null;
  let loadedEnvelope = null; // echoed envelope fields from the load message
  let saveTimer = null;
  let disposed = false;
  let eventSeq = 0;
  let currentTheme = null;
  let deleteConfirmSeq = 0;
  let pendingDeleteConfirmId = "";

  function postToParent(message) {
    // Same-origin local island; for file:// the parent origin is "null", so target "*" is
    // required. The parent authenticates by event.source identity, not origin.
    try {
      window.parent.postMessage(message, "*");
    } catch (_) {
      /* parent may already be gone during teardown */
    }
  }

  function reportError(phase, error) {
    postToParent({
      type: "flowjoe:calendar-error",
      phase: String(phase || ""),
      message: String((error && error.message) || error || "unknown error")
    });
  }

  function nextEventId() {
    eventSeq += 1;
    return `fc-evt-${eventSeq}-${Date.now().toString(36)}`;
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  // --- FlowJoe-owned serialization (NOT FullCalendar UI state) ---------------------------

  function serializeEvent(ev) {
    const props = ev && ev.extendedProps ? ev.extendedProps : {};
    // Phase 4 fidelity: each loaded event carries its FULL FlowJoe record in extendedProps.fjEvent.
    // Start from that record (so imported uid/timezone/status/organizer/attendees/recurrence/
    // sourceCalendar/location/description/url survive an edit), then override only the fields
    // FullCalendar owns/edited. A newly-created event has no fjEvent → just the basics.
    const base = props.fjEvent && typeof props.fjEvent === "object" ? props.fjEvent : {};
    return Object.assign({}, base, {
      id: ev.id || base.id || nextEventId(),
      title: ev.title || "",
      allDay: ev.allDay === true,
      // startStr/endStr are plain ISO-8601 strings; allDay yields a date-only string. These
      // are FlowJoe-owned values, not the engine's internal Date/view objects.
      start: ev.startStr || null,
      end: ev.endStr || null
    });
  }

  function currentSnapshot() {
    if (!calendar) return null;
    const envelope = loadedEnvelope && typeof loadedEnvelope === "object" ? loadedEnvelope : {};
    const events = calendar.getEvents().map(serializeEvent);
    // Keep a stable, human-meaningful order; the model layer (Phase 1) owns canonical ordering.
    events.sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));
    return Object.assign(
      {
        schema: SNAPSHOT_SCHEMA,
        version: SNAPSHOT_VERSION,
        engine: "fullcalendar",
        engineVersion: "",
        title: "Calendar",
        timezone: "local",
        defaultView: "dayGridMonth"
      },
      envelope,
      {events}
    );
  }

  function emitSave() {
    if (disposed) return;
    const snapshot = currentSnapshot();
    if (!snapshot) return;
    postToParent({type: "flowjoe:calendar-save", snapshot});
  }

  function scheduleSave() {
    if (disposed) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      emitSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function updateCalendarSize() {
    if (disposed || !calendar || typeof calendar.updateSize !== "function") return;
    try {
      calendar.updateSize();
    } catch (_) {
      /* best-effort resize sync */
    }
  }

  function syncEmptyState() {
    // The empty-state hint is styled on #fj-calendar-root (workbench.css): the class must land
    // there, not on <body>, or the hint never renders.
    const root = document.getElementById("fj-calendar-root");
    if (!root) return;
    try {
      const count = calendar && typeof calendar.getEvents === "function" ? calendar.getEvents().length : 0;
      root.classList.toggle("fj-calendar-empty", count === 0);
    } catch (_) {
      root.classList.remove("fj-calendar-empty");
    }
  }

  function applyTheme(theme) {
    if (!theme || typeof theme !== "object") return;
    currentTheme = theme;
    const root = document.documentElement;
    const set = (name, value) => {
      const text = String(value || "").trim();
      if (text) root.style.setProperty(name, text);
    };
    set("--fj-cal-bg", theme.bgPrimary);
    set("--fj-cal-panel", theme.bgSecondary);
    set("--fj-cal-panel-2", theme.bgTertiary);
    set("--fj-cal-panel-3", theme.hoverBg || theme.bgTertiary);
    set("--fj-cal-border", theme.borderColor);
    set("--fj-cal-border-soft", theme.borderLight || theme.borderColor);
    set("--fj-cal-text", theme.textPrimary);
    set("--fj-cal-muted", theme.textSecondary);
    set("--fj-cal-dim", theme.textSecondary);
    set("--fj-cal-accent", theme.accentColor);
    set("--fj-cal-font-family", theme.fontFamily);
    set("--fj-cal-color-scheme", theme.colorScheme);
    set("--fj-cal-font-size", theme.fontSize);
    set("--fj-cal-title-font-size", theme.titleFontSize);
    set("--fj-cal-control-font-size", theme.controlFontSize);
    set("--fj-cal-label-font-size", theme.labelFontSize);
    set("--fj-cal-small-font-size", theme.smallFontSize);
    set("--fj-cal-line-height", theme.lineHeight);
  }

  // --- Loading snapshot events into FullCalendar -----------------------------------------

  function snapshotEvents(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.events)) return [];
    return snapshot.events
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const def = {
          id: String(e.id || nextEventId()),
          title: String(e.title || "Untitled event"),
          allDay: e.allDay === true,
          // Preserve the WHOLE FlowJoe event record so fields FullCalendar doesn't edit
          // (uid/timezone/status/organizer/attendees/recurrence/sourceCalendar/etc.) survive a
          // round-trip. extendedProps is opaque to FullCalendar and untouched by drag/resize/edit.
          extendedProps: {fjEvent: e}
        };
        if (e.start) def.start = e.start;
        if (e.end) def.end = e.end;
        return def;
      });
  }

  function rememberEnvelope(snapshot) {
    if (snapshot && typeof snapshot === "object") {
      // Preserve EVERY envelope field except `events` (source metadata, warnings, title, timezone,
      // defaultView, engineVersion, …) so a save round-trips the full Phase 1 snapshot. `events` and
      // `eventOrder` are re-derived from the live calendar; the model recomputes eventOrder on save.
      const rest = {};
      Object.keys(snapshot).forEach((k) => {
        if (k !== "events" && k !== "eventOrder") rest[k] = snapshot[k];
      });
      rest.schema = rest.schema || SNAPSHOT_SCHEMA;
      if (!Number.isInteger(rest.version)) rest.version = SNAPSHOT_VERSION;
      rest.engine = rest.engine || "fullcalendar";
      loadedEnvelope = rest;
    } else {
      loadedEnvelope = {};
    }
    return loadedEnvelope;
  }

  // --- Event editor (Phase 5: local event creation + field editing) -----------------------
  // A small in-island form for adding/editing the user-facing event fields (title, all-day,
  // start/end, location, meeting URL, timezone, organizer, attendees, description). It edits the
  // FlowJoe event record stored on the FC event's extendedProps.fjEvent, so imported-only fields it
  // does not surface (uid/status/recurrence/sourceCalendar) still survive. Drag/resize still edit
  // start/end directly; clicking an event opens this editor.

  let editorEl = null;
  let editorState = {mode: "create", eventId: "", base: {}};

  function fieldRow(labelText, inputEl) {
    const row = document.createElement("label");
    row.className = "fj-ev-row";
    const span = document.createElement("span");
    span.className = "fj-ev-label";
    span.textContent = labelText;
    row.appendChild(span);
    row.appendChild(inputEl);
    return row;
  }

  function input(id, type) {
    const el = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    if (type !== "textarea") el.type = type || "text";
    el.id = id;
    el.className = "fj-ev-input";
    return el;
  }

  function currentUserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (_) {
      return "UTC";
    }
  }

  function timezoneOptions() {
    const fallback = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"];
    try {
      if (Intl.supportedValuesOf) {
        const zones = Intl.supportedValuesOf("timeZone");
        if (Array.isArray(zones) && zones.length) return zones;
      }
    } catch (_) {
      /* fall back below */
    }
    return fallback;
  }

  function timezoneSelect() {
    const el = document.createElement("select");
    el.id = "fj-ev-timezone";
    el.className = "fj-ev-input";
    return el;
  }

  function fillTimezoneOptions(selectedValue) {
    const select = document.getElementById("fj-ev-timezone");
    if (!select) return;
    const selected = String(selectedValue || currentUserTimezone() || "UTC").trim() || "UTC";
    const values = timezoneOptions();
    if (!values.includes(selected)) values.unshift(selected);
    select.replaceChildren();
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    select.value = selected;
  }

  function dateTimeInput(id) {
    const el = input(id, "text");
    el.inputMode = "numeric";
    el.placeholder = "YYYY-MM-DD HH:MM";
    el.autocomplete = "off";
    return el;
  }

  function buildEditor() {
    if (editorEl) return editorEl;
    const overlay = document.createElement("div");
    overlay.className = "fj-event-editor";
    overlay.hidden = true;
    const panel = document.createElement("div");
    panel.className = "fj-event-editor-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "fj-ev-heading");

    const titlebar = document.createElement("div");
    titlebar.className = "fj-event-editor-titlebar";

    const heading = document.createElement("div");
    heading.className = "fj-event-editor-heading";
    heading.id = "fj-ev-heading";
    heading.textContent = "Event";
    titlebar.appendChild(heading);

    const dragStrip = document.createElement("div");
    dragStrip.className = "fj-event-editor-drag-strip";
    dragStrip.setAttribute("aria-hidden", "true");
    dragStrip.innerHTML = '<div class="floating-inline-grip"><span></span><span></span><span></span></div>';
    titlebar.appendChild(dragStrip);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "fj-event-editor-close";
    closeBtn.setAttribute("aria-label", "Close event editor");
    closeBtn.textContent = "×";
    titlebar.appendChild(closeBtn);
    panel.appendChild(titlebar);

    const body = document.createElement("div");
    body.className = "fj-event-editor-body";

    const allDay = input("fj-ev-allday", "checkbox");
    const allDayRow = document.createElement("label");
    allDayRow.className = "fj-ev-row fj-ev-row-inline";
    allDayRow.appendChild(allDay);
    const allDaySpan = document.createElement("span");
    allDaySpan.textContent = "All day";
    allDayRow.appendChild(allDaySpan);

    const fields = document.createElement("div");
    fields.className = "fj-event-editor-fields";
    const titleRow = fieldRow("Title", input("fj-ev-title", "text"));
    titleRow.classList.add("fj-ev-field-wide");
    allDayRow.classList.add("fj-ev-field-compact");
    const descriptionInput = input("fj-ev-description", "textarea");
    const descriptionRow = fieldRow("Description", descriptionInput);
    descriptionRow.classList.add("fj-ev-field-wide");
    fields.appendChild(titleRow);
    fields.appendChild(allDayRow);
    fields.appendChild(fieldRow("Timezone", timezoneSelect()));
    fields.appendChild(fieldRow("Start", dateTimeInput("fj-ev-start")));
    fields.appendChild(fieldRow("End", dateTimeInput("fj-ev-end")));
    fields.appendChild(fieldRow("Location", input("fj-ev-location", "text")));
    fields.appendChild(fieldRow("Meeting URL", input("fj-ev-url", "text")));
    fields.appendChild(fieldRow("Organizer", input("fj-ev-organizer", "text")));
    fields.appendChild(fieldRow("Attendees", input("fj-ev-attendees", "text")));
    fields.appendChild(descriptionRow);
    body.appendChild(fields);

    const actions = document.createElement("div");
    actions.className = "fj-event-editor-actions";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.id = "fj-ev-save";
    saveBtn.className = "fj-ev-btn fj-ev-btn-save";
    saveBtn.textContent = "Save";
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.id = "fj-ev-delete";
    deleteBtn.className = "fj-ev-btn fj-ev-btn-delete";
    deleteBtn.textContent = "Delete";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.id = "fj-ev-cancel";
    cancelBtn.className = "fj-ev-btn";
    cancelBtn.textContent = "Cancel";
    actions.appendChild(deleteBtn);
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    body.appendChild(actions);
    panel.appendChild(body);

    overlay.appendChild(panel);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) closeEditor();
    });
    closeBtn.addEventListener("click", closeEditor);
    saveBtn.addEventListener("click", saveEditor);
    deleteBtn.addEventListener("click", confirmDeleteEditorEvent);
    cancelBtn.addEventListener("click", closeEditor);
    enablePanelDrag(panel, titlebar, closeBtn);
    enableDescriptionParentResize(panel, descriptionInput);
    enablePanelMinimumResizeBounds(panel);
    document.body.appendChild(overlay);
    editorEl = overlay;
    return overlay;
  }

  function materializePanelBox(panel) {
    if (!panel) return null;
    const rect = panel.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.width = `${rect.width}px`;
    panel.style.height = `${rect.height}px`;
    panel.style.transform = "none";
    return rect;
  }

  function syncEditorPanelResizeBounds(panel) {
    if (!panel || !editorEl || editorEl.hidden) return;
    const titlebar = panel.querySelector(".fj-event-editor-titlebar");
    const body = panel.querySelector(".fj-event-editor-body");
    const fields = panel.querySelector(".fj-event-editor-fields");
    const actions = panel.querySelector(".fj-event-editor-actions");
    if (!titlebar || !body || !fields || !actions) return;
    const maxWidth = Math.max(320, window.innerWidth - 32);
    const maxHeight = Math.max(320, window.innerHeight - 32);
    const bodyStyles = getComputedStyle(body);
    const bodyPaddingY = parseFloat(bodyStyles.paddingTop || "0") + parseFloat(bodyStyles.paddingBottom || "0");
    const neededHeight = Math.ceil(titlebar.offsetHeight + fields.scrollHeight + actions.offsetHeight + bodyPaddingY + 24);
    const minWidth = Math.min(maxWidth, window.innerWidth <= 560 ? 360 : 560);
    const minHeight = Math.min(maxHeight, Math.max(320, neededHeight));
    panel.style.minWidth = `${minWidth}px`;
    panel.style.minHeight = `${minHeight}px`;
    const rect = panel.getBoundingClientRect();
    if (rect.height < minHeight - 1) {
      materializePanelBox(panel);
      panel.style.height = `${Math.max(rect.height, minHeight)}px`;
    }
  }

  function enablePanelMinimumResizeBounds(panel) {
    if (!panel || typeof ResizeObserver !== "function") return;
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        syncEditorPanelResizeBounds(panel);
      });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(panel);
    const body = panel.querySelector(".fj-event-editor-body");
    const fields = panel.querySelector(".fj-event-editor-fields");
    if (body) observer.observe(body);
    if (fields) observer.observe(fields);
    window.addEventListener("resize", schedule);
  }

  function enableDescriptionParentResize(panel, textarea) {
    if (!panel || !textarea || typeof ResizeObserver !== "function") return;
    let lastHeight = 0;
    let suppress = false;
    const observer = new ResizeObserver((entries) => {
      if (suppress) return;
      const entry = entries && entries[0];
      const nextHeight = entry && entry.contentRect ? entry.contentRect.height : textarea.getBoundingClientRect().height;
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      if (!lastHeight) {
        lastHeight = nextHeight;
        return;
      }
      const delta = nextHeight - lastHeight;
      lastHeight = nextHeight;
      if (Math.abs(delta) < 1) return;
      const rect = materializePanelBox(panel);
      if (!rect) return;
      const lockedWidth = rect.width;
      const maxHeight = Math.max(320, window.innerHeight - rect.top - 12);
      syncEditorPanelResizeBounds(panel);
      const minHeight = Math.max(320, parseFloat(getComputedStyle(panel).minHeight) || 320);
      const nextPanelHeight = Math.max(minHeight, Math.min(maxHeight, rect.height + delta));
      if (Math.abs(nextPanelHeight - rect.height) < 1) return;
      suppress = true;
      panel.style.width = `${lockedWidth}px`;
      panel.style.height = `${nextPanelHeight}px`;
      requestAnimationFrame(() => {
        suppress = false;
      });
    });
    observer.observe(textarea);
  }

  function enablePanelDrag(panel, titlebar, closeBtn) {
    let drag = null;
    titlebar.addEventListener("pointerdown", (event) => {
      if (event.target === closeBtn || event.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      drag = {
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top
      };
      panel.classList.add("is-dragging");
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.transform = "none";
      try {
        titlebar.setPointerCapture(event.pointerId);
      } catch (_) {}
      event.preventDefault();
    });
    titlebar.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const width = panel.offsetWidth || 420;
      const height = panel.offsetHeight || 420;
      const maxLeft = Math.max(12, window.innerWidth - width - 12);
      const maxTop = Math.max(12, window.innerHeight - height - 12);
      const left = Math.min(maxLeft, Math.max(12, event.clientX - drag.dx));
      const top = Math.min(maxTop, Math.max(12, event.clientY - drag.dy));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    });
    const stop = (event) => {
      if (!drag) return;
      drag = null;
      panel.classList.remove("is-dragging");
      try {
        titlebar.releasePointerCapture(event.pointerId);
      } catch (_) {}
    };
    titlebar.addEventListener("pointerup", stop);
    titlebar.addEventListener("pointercancel", stop);
  }

  function toLocalInput(iso) {
    const v = String(iso || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v} 00:00`; // all-day → midnight in the datetime field
    return v.slice(0, 16).replace("T", " "); // "YYYY-MM-DDTHH:MM(:SS)(Z)" → "YYYY-MM-DD HH:MM"
  }

  function readDateField(id, allDay) {
    const v = String(document.getElementById(id).value || "")
      .trim()
      .replace(/\s+/, "T");
    if (!v) return "";
    if (allDay) return v.slice(0, 10); // date-only
    return v.length === 16 ? `${v}:00` : v; // datetime-local has no seconds
  }

  function openEditor(mode, opts) {
    buildEditor();
    pendingDeleteConfirmId = "";
    const o = opts && typeof opts === "object" ? opts : {};
    const base = isPlainObject(o.base) ? o.base : {};
    editorState = {mode: mode === "edit" ? "edit" : "create", eventId: String(o.eventId || base.id || nextEventId()), base};
    document.getElementById("fj-ev-heading").textContent = editorState.mode === "edit" ? "Edit event" : "New event";
    document.getElementById("fj-ev-delete").style.display = editorState.mode === "edit" ? "" : "none";
    document.getElementById("fj-ev-title").value = String(o.title != null ? o.title : base.title || "");
    document.getElementById("fj-ev-allday").checked = Boolean(o.allDay != null ? o.allDay : base.allDay);
    document.getElementById("fj-ev-start").value = toLocalInput(o.start != null ? o.start : base.start);
    document.getElementById("fj-ev-end").value = toLocalInput(o.end != null ? o.end : base.end);
    document.getElementById("fj-ev-location").value = String(base.location || "");
    document.getElementById("fj-ev-url").value = String(base.url || "");
    fillTimezoneOptions(base.timezone || (loadedEnvelope && loadedEnvelope.timezone) || currentUserTimezone());
    const org = isPlainObject(base.organizer) ? base.organizer : {};
    document.getElementById("fj-ev-organizer").value = org.name || org.email ? `${org.name || ""}${org.email ? ` <${org.email}>` : ""}`.trim() : "";
    document.getElementById("fj-ev-attendees").value = Array.isArray(base.attendees)
      ? base.attendees
          .map((a) => (a && (a.email || a.name) ? `${a.name || ""}${a.email ? ` <${a.email}>` : ""}`.trim() : ""))
          .filter(Boolean)
          .join(", ")
      : "";
    document.getElementById("fj-ev-description").value = String(base.description || "");
    const panel = editorEl.querySelector(".fj-event-editor-panel");
    if (panel) {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.transform = "";
      panel.style.width = "";
      panel.style.height = "";
    }
    editorEl.hidden = false;
    setTimeout(() => {
      syncEditorPanelResizeBounds(panel);
      try {
        document.getElementById("fj-ev-title").focus();
      } catch (_) {}
    }, 0);
  }

  function closeEditor() {
    pendingDeleteConfirmId = "";
    if (editorEl) editorEl.hidden = true;
    try {
      calendar && calendar.unselect();
    } catch (_) {}
  }

  function confirmDeleteEditorEvent() {
    if (!calendar || !editorState.eventId) return;
    const ev = calendar.getEventById(editorState.eventId);
    if (!ev) return;
    deleteConfirmSeq += 1;
    pendingDeleteConfirmId = `delete-${deleteConfirmSeq}-${Date.now().toString(36)}`;
    postToParent({
      type: "flowjoe:calendar-confirm-delete-event",
      requestId: pendingDeleteConfirmId,
      title: ev.title || editorState.base?.title || "Untitled event"
    });
  }

  function parsePerson(text) {
    const v = String(text || "").trim();
    if (!v) return {name: "", email: ""};
    const m = v.match(/^(.*)<([^>]+)>\s*$/);
    if (m) return {name: m[1].trim(), email: m[2].trim()};
    return /@/.test(v) ? {name: "", email: v} : {name: v, email: ""};
  }

  function saveEditor() {
    if (!calendar) return;
    const allDay = document.getElementById("fj-ev-allday").checked;
    const start = readDateField("fj-ev-start", allDay);
    const end = readDateField("fj-ev-end", allDay);
    const organizer = parsePerson(document.getElementById("fj-ev-organizer").value);
    const attendees = String(document.getElementById("fj-ev-attendees").value || "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(parsePerson);
    // Start from the preserved record (keeps uid/status/recurrence/sourceCalendar), then apply edits.
    const fjEvent = Object.assign({}, editorState.base, {
      id: editorState.eventId,
      title: String(document.getElementById("fj-ev-title").value || "").trim() || "Untitled event",
      allDay,
      start,
      end,
      location: String(document.getElementById("fj-ev-location").value || ""),
      url: String(document.getElementById("fj-ev-url").value || ""),
      timezone: String(document.getElementById("fj-ev-timezone").value || ""),
      description: String(document.getElementById("fj-ev-description").value || ""),
      organizer,
      attendees
    });
    const existing = calendar.getEventById(editorState.eventId);
    if (existing) existing.remove();
    const def = {id: fjEvent.id, title: fjEvent.title, allDay, extendedProps: {fjEvent}};
    if (start) def.start = start;
    if (end) def.end = end;
    calendar.addEvent(def);
    syncEmptyState();
    closeEditor();
    scheduleSave();
  }

  function deleteEditorEvent() {
    pendingDeleteConfirmId = "";
    if (calendar && editorState.eventId) {
      const ev = calendar.getEventById(editorState.eventId);
      if (ev) {
        ev.remove();
        syncEmptyState();
        scheduleSave();
      }
    }
    closeEditor();
  }

  function onDateSelect(info) {
    openEditor("create", {eventId: nextEventId(), start: info.startStr, end: info.endStr, allDay: info.allDay, title: ""});
  }

  function onEventClick(info) {
    const ev = info && info.event;
    if (!ev) return;
    const base = ev.extendedProps && isPlainObject(ev.extendedProps.fjEvent) ? ev.extendedProps.fjEvent : {};
    openEditor("edit", {eventId: ev.id, base, title: ev.title, allDay: ev.allDay, start: ev.startStr, end: ev.endStr});
  }

  // --- Mount / dispose --------------------------------------------------------------------

  function mountAndLoad(snapshot) {
    if (calendar) return; // load is one-shot per island instance
    const FC = window.FullCalendar;
    if (!FC || typeof FC.Calendar !== "function") {
      reportError("init", new Error("FullCalendar global missing (Standard bundles failed to load)"));
      return;
    }

    try {
      const envelope = rememberEnvelope(snapshot);
      applyTheme(currentTheme);
      const root = document.getElementById("fj-calendar-root");
      calendar = new FC.Calendar(root, {
        // Standard MIT plugins only; each auto-registered into FC.globalPlugins on load.
        initialView: envelope.defaultView || "dayGridMonth",
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
        },
        buttonText: {today: "Today", month: "Month", week: "Week", day: "Day", list: "List"},
        height: "100%",
        expandRows: true,
        fixedWeekCount: false,
        dayMaxEventRows: 3,
        stickyHeaderDates: true,
        handleWindowResize: true,
        selectable: true, // interaction plugin: drag-select to create
        editable: true, // interaction plugin: drag to move
        eventStartEditable: true,
        eventDurationEditable: true, // resize to change duration
        nowIndicator: false,
        events: snapshotEvents(snapshot),
        select: onDateSelect,
        eventClick: onEventClick,
        eventDrop: () => {
          syncEmptyState();
          scheduleSave();
        }, // drag committed
        eventResize: () => {
          syncEmptyState();
          scheduleSave();
        }, // resize committed
        eventAdd: syncEmptyState,
        eventRemove: syncEmptyState,
        eventsSet: syncEmptyState
      });
      calendar.render();
      syncEmptyState();
      updateCalendarSize();

      // Automation/debug seam, scoped to THIS isolated island window only (never the main
      // renderer). Lets the smoke test drive real FullCalendar API calls (create/edit/delete/
      // move/resize/changeView) and read the FlowJoe-owned snapshot — mirrors the spreadsheet
      // island's __flowjoeSpreadsheetWorkbench seam.
      try {
        window.__flowjoeCalendarWorkbench = {
          getCalendar: () => calendar,
          addEvent: (def) => calendar.addEvent(Object.assign({id: nextEventId()}, def || {})),
          getEventById: (id) => calendar.getEventById(id),
          getEvents: () => calendar.getEvents(),
          changeView: (name) => calendar.changeView(name),
          currentViewType: () => (calendar.view ? calendar.view.type : ""),
          snapshot: () => currentSnapshot(),
          requestSave: () => emitSave(),
          // Phase 5 event-editor seam (lets the smoke drive the real form).
          openNewEventEditor: (opts) => openEditor("create", opts || {}),
          openEventEditor: (id) => {
            const ev = calendar.getEventById(id);
            if (ev) onEventClick({event: ev});
          },
          saveEventEditor: () => saveEditor(),
          deleteEventInEditor: () => deleteEditorEvent(),
          editorVisible: () => Boolean(editorEl && !editorEl.hidden)
        };
      } catch (_) {}

      postToParent({type: "flowjoe:calendar-loaded"});
    } catch (error) {
      reportError("load", error);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    try {
      // destroy() unbinds FullCalendar's DOM + document/window listeners and removes its
      // injected nodes from THIS island document. Combined with the parent dropping the
      // iframe, nothing leaks into the main renderer.
      if (calendar && typeof calendar.destroy === "function") calendar.destroy();
    } catch (_) {
      /* best-effort */
    }
    calendar = null;
    try {
      delete window.__flowjoeCalendarWorkbench;
    } catch (_) {}
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;

    switch (data.type) {
      case "flowjoe:calendar-load":
        applyTheme(data.theme);
        mountAndLoad(data.snapshot);
        break;
      case "flowjoe:calendar-theme":
        applyTheme(data.theme);
        break;
      case "flowjoe:calendar-request-save":
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        emitSave();
        break;
      case "flowjoe:calendar-delete-event-confirmed":
        if (data.requestId && data.requestId === pendingDeleteConfirmId) {
          if (data.confirmed === true) deleteEditorEvent();
          else pendingDeleteConfirmId = "";
        }
        break;
      case "flowjoe:calendar-dispose":
        dispose();
        break;
      default:
        break;
    }
  });

  window.addEventListener("resize", updateCalendarSize);

  // Tell the parent we're ready for a snapshot once the bundles have executed.
  postToParent({type: "flowjoe:calendar-ready"});
})();
