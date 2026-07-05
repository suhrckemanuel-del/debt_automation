from __future__ import annotations

import html
from urllib.parse import urlencode

from .mapping import MappingDraft, MappingService, MappingSlot, SLOTS


def _escape(value: object) -> str:
    return html.escape(str(value), quote=True)


def _step_url(workspace_id: str, step: int) -> str:
    return "/workspace/map?" + urlencode(
        {"workspace": workspace_id, "step": step}
    )


def _render_role_step(
    service: MappingService, draft: MappingDraft
) -> str:
    options_by_role: list[str] = []
    for role, expected_type in (
        ("facility", "facility_agreement"),
        ("amendment", "amendment_letter"),
        ("waiver", "waiver_letter"),
    ):
        options = []
        for document in service.registry.documents:
            selected = (
                " selected"
                if draft.roles.get(role) == document.document_id
                else ""
            )
            type_hint = (
                ""
                if document.document_type == expected_type
                else f" · {document.document_type}"
            )
            options.append(
                f'<option value="{_escape(document.document_id)}"{selected}>'
                f"{_escape(document.title)}{_escape(type_hint)}</option>"
            )
        options_by_role.append(
            f"""
            <label for="role-{role}">{role.title()} document</label>
            <select id="role-{role}" name="{role}" required>
              <option value="">Choose a document</option>
              {''.join(options)}
            </select>
            """
        )
    return f"""
    <form method="post" action="/workspace/map/save" class="wizard-form">
      <input type="hidden" name="workspace" value="{_escape(service.workspace_id)}">
      <input type="hidden" name="step" value="1">
      <p>Assign the three controlling document roles. Each role must use a different imported document.</p>
      {''.join(options_by_role)}
      <label class="confirmation">
        <input type="checkbox"
               name="confirm_amendment_relationship"
               value="yes"
               {'checked' if draft.relationship_confirmations.get('amendment_modifies_facility') else ''}
               required>
        <span>I confirm the selected amendment modifies the selected facility agreement.</span>
      </label>
      <label class="confirmation">
        <input type="checkbox"
               name="confirm_waiver_relationship"
               value="yes"
               {'checked' if draft.relationship_confirmations.get('waiver_is_limited_relief') else ''}
               required>
        <span>I confirm the selected waiver is limited relief related to the facility and amendment, not a replacement amendment.</span>
      </label>
      <div class="actions">
        <button class="primary" type="submit">Save and continue</button>
      </div>
    </form>
    """


def _field_input(slot: MappingSlot, field_name: str, value: str) -> str:
    labels = {
        "value": "LTV value (%)",
        "applies_from": "Applies from",
        "applies_to": "Applies to",
        "test_date": "Test Date",
        "relief_above": "Relief above (%)",
        "relief_up_to": "Relief up to (%)",
    }
    input_type = (
        "date"
        if field_name in {"applies_from", "applies_to", "test_date"}
        else "number"
    )
    step = ' step="0.01"' if input_type == "number" else ""
    return f"""
      <label for="{slot.slot_id}-{field_name}">{labels[field_name]}</label>
      <input id="{slot.slot_id}-{field_name}"
             name="{slot.slot_id}_{field_name}"
             type="{input_type}"{step}
             value="{_escape(value)}" required>
    """


def _render_slot(
    service: MappingService, draft: MappingDraft, slot: MappingSlot
) -> str:
    entry = draft.slots.get(slot.slot_id, {})
    selected_passage = entry.get("passage_id", "")
    candidates = service.candidates(slot.slot_id, draft)
    candidate_html = []
    for index, candidate in enumerate(candidates):
        checked = " checked" if candidate.passage_id == selected_passage else ""
        reason = " · ".join(candidate.reasons)
        source_id = f"{slot.slot_id}-candidate-{index}-source"
        candidate_html.append(
            f"""
            <label class="candidate">
              <input type="radio"
                     name="{slot.slot_id}_passage_id"
                     value="{_escape(candidate.passage_id)}"
                     data-target="{slot.slot_id}-quote"
                     data-source="{_escape(source_id)}"{checked} required>
              <span>
                <strong>{_escape(candidate.document_title)}</strong>
                <small>{_escape(candidate.locator)} · page {candidate.page} · score {candidate.score:.1f}</small>
                <small>{_escape(reason)}</small>
              </span>
              <details>
                <summary>Preview source passage</summary>
                <pre id="{_escape(source_id)}">{_escape(candidate.text)}</pre>
              </details>
            </label>
            """
        )
    if not candidate_html:
        candidate_html.append(
            '<div class="error">No candidate passages were found in the assigned document.</div>'
        )

    structured_fields = "".join(
        _field_input(
            slot,
            field_name,
            str(entry.get(field_name, "")),
        )
        for field_name in slot.required_fields
    )
    return f"""
    <section class="slot-card">
      <h2>{_escape(slot.label)}</h2>
      <p class="muted">Select one locally ranked passage, then trim the quotation to the exact supporting text.</p>
      <div class="candidates">{''.join(candidate_html)}</div>
      <label for="{slot.slot_id}-quote">Exact supporting quotation</label>
      <textarea id="{slot.slot_id}-quote"
                name="{slot.slot_id}_quote"
                required>{_escape(entry.get('quote', ''))}</textarea>
      <div class="field-grid">{structured_fields}</div>
    </section>
    """


def _render_provision_step(
    service: MappingService, draft: MappingDraft, step: int
) -> str:
    cards = "".join(
        _render_slot(service, draft, slot)
        for slot in SLOTS
        if slot.step == step
    )
    previous = step - 1
    return f"""
    <form method="post" action="/workspace/map/save" class="wizard-form">
      <input type="hidden" name="workspace" value="{_escape(service.workspace_id)}">
      <input type="hidden" name="step" value="{step}">
      {cards}
      <div class="actions split">
        <a class="secondary" href="{_step_url(service.workspace_id, previous)}">Back</a>
        <button class="primary" type="submit">Save and continue</button>
      </div>
    </form>
    <script>
      document.querySelectorAll('input[type="radio"][data-target]').forEach((radio) => {{
        radio.addEventListener("change", () => {{
          if (radio.checked) {{
            const source = document.getElementById(radio.dataset.source);
            document.getElementById(radio.dataset.target).value = source.textContent;
          }}
        }});
      }});
    </script>
    """


def _render_review_step(
    service: MappingService, draft: MappingDraft
) -> str:
    errors = service.validate_draft(draft)
    rows = []
    for slot in SLOTS:
        entry = draft.slots.get(slot.slot_id, {})
        rows.append(
            f"""
            <tr>
              <td>{_escape(slot.label)}</td>
              <td>{_escape(entry.get('locator', 'Not mapped'))}</td>
              <td>page {_escape(entry.get('page', '—'))}</td>
              <td>{'Ready' if service._slot_complete(entry, slot) else 'Incomplete'}</td>
            </tr>
            """
        )
    error_html = ""
    if errors:
        error_html = (
            '<div class="error"><strong>Activation is blocked:</strong><ul>'
            + "".join(f"<li>{_escape(error)}</li>" for error in errors)
            + "</ul></div>"
        )
    disabled = " disabled" if errors else ""
    return f"""
    {error_html}
    <div class="review-card">
      <table>
        <thead><tr><th>Provision</th><th>Locator</th><th>Page</th><th>Status</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
    </div>
    <form method="post" action="/workspace/map/activate">
      <input type="hidden" name="workspace" value="{_escape(service.workspace_id)}">
      <div class="actions split">
        <a class="secondary" href="{_step_url(service.workspace_id, 4)}">Back</a>
        <button class="primary" type="submit"{disabled}>Validate and activate full answers</button>
      </div>
    </form>
    """


def render_mapping_wizard(
    service: MappingService,
    step: int,
    notice: str = "",
) -> str:
    draft = service.load_draft()
    reviewed, total = service.progress(draft)
    status = service.status().value
    step = min(max(step, 1), 5)
    step_titles = {
        1: "Assign document roles",
        2: "Map LTV provisions",
        3: "Map Distribution provisions",
        4: "Map Disposal and prepayment",
        5: "Review and activate",
    }
    if step == 1:
        content = _render_role_step(service, draft)
    elif step in {2, 3, 4}:
        content = _render_provision_step(service, draft, step)
    else:
        content = _render_review_step(service, draft)

    stepper = "".join(
        f'<a class="step {"active" if number == step else ""}" '
        f'href="{_step_url(service.workspace_id, number)}">'
        f"<span>{number}</span>{_escape(title)}</a>"
        for number, title in step_titles.items()
    )
    notice_class = "error" if notice.startswith(("Could not", "Activation failed")) else "notice"
    notice_html = (
        f'<div class="{notice_class}">{_escape(notice)}</div>' if notice else ""
    )
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Guided Mapping · {_escape(service.registry.workspace_name)}</title>
  <style>
    :root {{ --ink:#17211b; --muted:#617069; --paper:#f6f5ef; --card:#fffef9; --line:#d9ddd6; --accent:#214e3b; --soft:#e7efe9; --danger:#991b1b; --danger-soft:#fee2e2; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; background:var(--paper); color:var(--ink); font:15px/1.5 Inter,system-ui,sans-serif; }}
    main {{ width:min(1120px,calc(100% - 30px)); margin:34px auto 70px; }}
    a {{ color:var(--accent); }}
    header {{ display:flex; justify-content:space-between; gap:20px; align-items:flex-start; margin-bottom:22px; }}
    h1 {{ margin:3px 0 5px; font-size:34px; }}
    h2 {{ margin:0 0 6px; font-size:20px; }}
    .eyebrow {{ color:var(--accent); font-size:12px; font-weight:850; letter-spacing:.1em; text-transform:uppercase; }}
    .muted {{ color:var(--muted); }}
    .badge {{ border-radius:999px; background:var(--soft); color:var(--accent); font-weight:800; padding:7px 11px; white-space:nowrap; }}
    .stepper {{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:20px; }}
    .step {{ border:1px solid var(--line); border-radius:11px; background:var(--card); color:var(--muted); padding:10px; text-decoration:none; font-size:13px; }}
    .step span {{ display:inline-grid; place-items:center; width:22px; height:22px; margin-right:5px; border-radius:50%; background:#edf0ec; font-weight:850; }}
    .step.active {{ border-color:var(--accent); color:var(--accent); box-shadow:0 5px 20px rgba(33,78,59,.08); }}
    .wizard-shell,.slot-card,.review-card {{ border:1px solid var(--line); border-radius:16px; background:var(--card); box-shadow:0 12px 35px rgba(38,54,44,.06); }}
    .wizard-shell {{ padding:24px; }}
    .slot-card {{ padding:20px; margin:0 0 18px; }}
    label {{ display:block; margin:12px 0 6px; font-weight:750; }}
    select,input,textarea {{ width:100%; border:1px solid #bdc6bf; border-radius:9px; background:#fff; color:var(--ink); font:inherit; padding:10px 12px; }}
    .confirmation {{ display:flex; gap:9px; align-items:flex-start; font-weight:650; }}
    .confirmation input {{ width:auto; margin-top:4px; }}
    textarea {{ min-height:125px; resize:vertical; }}
    .field-grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }}
    .candidates {{ display:grid; gap:9px; margin:13px 0; }}
    .candidate {{ display:grid; grid-template-columns:auto 1fr; gap:10px; border:1px solid var(--line); border-radius:11px; padding:11px; margin:0; font-weight:400; }}
    .candidate:has(input:checked) {{ border-color:var(--accent); background:#f3f7f3; }}
    .candidate input {{ width:auto; margin-top:5px; }}
    .candidate span {{ display:flex; flex-direction:column; }}
    .candidate small {{ color:var(--muted); }}
    .candidate details {{ grid-column:2; }}
    pre {{ white-space:pre-wrap; max-height:220px; overflow:auto; background:#f4f5f1; border-radius:8px; padding:10px; }}
    .actions {{ display:flex; justify-content:flex-end; margin-top:18px; }}
    .actions.split {{ justify-content:space-between; }}
    button,.secondary {{ border:0; border-radius:9px; padding:11px 16px; font:inherit; font-weight:800; text-decoration:none; cursor:pointer; }}
    .primary {{ background:var(--accent); color:white; }}
    .primary:disabled {{ opacity:.45; cursor:not-allowed; }}
    .secondary {{ background:#e8ece8; color:var(--ink); }}
    .error {{ margin:0 0 16px; color:var(--danger); background:var(--danger-soft); border-radius:10px; padding:12px; }}
    .notice {{ margin:0 0 16px; color:var(--accent); background:var(--soft); border-radius:10px; padding:12px; }}
    table {{ width:100%; border-collapse:collapse; }}
    th,td {{ border-bottom:1px solid var(--line); padding:10px; text-align:left; }}
    .review-card {{ padding:10px 16px; overflow:auto; }}
    @media(max-width:760px) {{ header {{ flex-direction:column; }} .stepper {{ grid-template-columns:1fr; }} .field-grid {{ grid-template-columns:1fr; }} }}
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <div class="eyebrow">Local reviewed configuration</div>
        <h1>{_escape(step_titles[step])}</h1>
        <div class="muted">{_escape(service.registry.workspace_name)} · {reviewed}/{total} provisions reviewed</div>
      </div>
      <div class="badge">{_escape(status)}</div>
    </header>
    <nav class="stepper">{stepper}</nav>
    {notice_html}
    <div class="wizard-shell">{content}</div>
    <p><a href="/?workspace={_escape(service.workspace_id)}">← Back to answer assistant</a></p>
  </main>
</body>
</html>"""
