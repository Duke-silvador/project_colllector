"""Tabla editable BASS con borrador completo y páginas independientes."""
from uuid import uuid4
import pandas as pd
import streamlit as st
from idiomas import texto
from bass import FIELDS, INSURED_FIELDS, alertas_lectura, completar_asegurado, separar_asegurado

VISUAL_FIELDS = tuple(field for field in FIELDS if field != 'insured_name')
VISUAL_FIELDS = VISUAL_FIELDS[:2] + INSURED_FIELDS + VISUAL_FIELDS[2:]


def alertas_fila(entry):
    alerts = alertas_lectura(entry['values'], entry['original'])
    reason = alerts.pop('insured_name', None)
    original = separar_asegurado(entry['original']['values'].get('insured_name')) if entry['original'] else {}
    for field in INSURED_FIELDS:
        value = entry['values'].get(field, '')
        if field == 'insured_company_name' and not value.strip():
            alerts[field] = 'missing'
        elif reason and value and value == original.get(field):
            alerts[field] = reason
    return alerts


def aplicar_edicion(entries, visible_ids, changes):
    """Aplica cambios de la página sin perder filas ocultas ni su origen OCR."""
    by_id = {entry['id']: entry for entry in entries}
    for position, fields in changes.get('edited_rows', {}).items():
        entry = by_id[visible_ids[int(position)]]
        for field, value in fields.items():
            if field in FIELDS + INSURED_FIELDS:
                entry['values'][field] = '' if value is None or pd.isna(value) else str(value)
    removed = {visible_ids[int(position)] for position in changes.get('deleted_rows', [])}
    entries[:] = [entry for entry in entries if entry['id'] not in removed]
    for row in changes.get('added_rows', []):
        values = {field: '' if row.get(field) is None or pd.isna(row.get(field)) else str(row[field])
                  for field in FIELDS + INSURED_FIELDS}
        if not values['insured_name']:
            values['insured_name'] = '; '.join(filter(None, [values[f] for f in INSURED_FIELDS]))
        entries.append({'id': uuid4().hex, 'original': None, 'values': values})


def describir(alerts):
    reasons = {'missing': texto('vacío', 'missing'), 'invalid': texto('inválido', 'invalid')}
    return '; '.join(f'{field}: {reasons.get(reason, reason)}' for field, reason in alerts.items())


def tabla_editable(extracted, suffix):
    state_key = 'bass_rows_' + suffix
    version_key = 'bass_rows_version_' + suffix
    page_key = 'bass_rows_page_' + suffix
    st.session_state.setdefault(state_key, [
        {'id': uuid4().hex, 'values': completar_asegurado(row['values']), 'original': row} for row in extracted])
    st.session_state.setdefault(version_key, 0)
    st.session_state.setdefault(page_key, 1)
    entries = st.session_state[state_key]
    for entry in entries:
        entry['values'] = completar_asegurado(entry['values'])

    def reset_page():
        st.session_state[page_key] = 1

    areas = st.columns([2, 3, 2])
    all_fields = texto('Todos los campos', 'All fields')
    field = areas[0].selectbox(texto('Buscar en', 'Search in'), [all_fields] + list(VISUAL_FIELDS),
                              key='bass_rows_field_' + suffix, on_change=reset_page)
    search = areas[1].text_input(texto('Buscar en la tabla', 'Search table'),
                                key='bass_rows_search_' + suffix, on_change=reset_page).strip().casefold()
    statuses = [texto('Todas las filas', 'All rows'), texto('Con alertas', 'With alerts'), texto('Sin alertas', 'Without alerts')]
    status = areas[2].selectbox(texto('Revisión OCR', 'OCR review'), statuses,
                               key='bass_rows_status_' + suffix, on_change=reset_page)
    alerts = {entry['id']: alertas_fila(entry) for entry in entries}
    visible = [(number, entry) for number, entry in enumerate(entries, 1)
               if (not search or any(search in entry['values'][f].casefold()
                                     for f in (VISUAL_FIELDS if field == all_fields else [field])))
               and (status == statuses[0] or bool(alerts[entry['id']]) == (status == statuses[1]))]
    table_container = st.container()
    controls = st.columns([2, 2, 3])
    size = controls[0].selectbox(texto('Filas por página', 'Rows per page'), [10, 25, 50, 100], index=1,
                                key='bass_rows_size_' + suffix, on_change=reset_page)
    pages = max(1, (len(visible) + size - 1) // size)
    st.session_state[page_key] = min(max(1, st.session_state[page_key]), pages)
    page = controls[1].number_input(texto('Página', 'Page'), min_value=1, max_value=pages, step=1, key=page_key)
    start = (page - 1) * size
    selected = visible[start:start + size]
    controls[2].caption(texto(
        f'{start + 1 if visible else 0}–{min(start + size, len(visible))} de {len(visible)} filas filtradas; {len(entries)} en total. Página {page}/{pages}.',
        f'{start + 1 if visible else 0}–{min(start + size, len(visible))} of {len(visible)} filtered rows; {len(entries)} total. Page {page}/{pages}.'))
    frame = pd.DataFrame([{'Row': number, 'OCR review': describir(alerts[entry['id']]), **entry['values']}
                          for number, entry in selected], columns=['Row', 'OCR review', *VISUAL_FIELDS])
    editor_key = f'bass_rows_editor_{suffix}_{st.session_state[version_key]}_{page}_{size}_{field}_{search}_{status}'
    visible_ids = [entry['id'] for _, entry in selected]

    def save_edits():
        aplicar_edicion(st.session_state[state_key], visible_ids, st.session_state[editor_key])
        st.session_state[version_key] += 1
        st.session_state['bass_confirm_' + suffix] = False

    with table_container:
        st.data_editor(frame, num_rows='dynamic', disabled=['Row', 'OCR review'], hide_index=True,
                       column_config={'Row': st.column_config.NumberColumn(texto('Fila', 'Row')),
                                      'insured_person_name': st.column_config.TextColumn(texto('Nombre de la persona', 'Person name')),
                                      'insured_company_name': st.column_config.TextColumn(texto('Nombre de la compañía', 'Company name'))},
                       width='stretch', key=editor_key, on_change=save_edits)
    pending = sum(bool(value) for value in alerts.values())
    if pending:
        st.warning(texto(f'{pending} filas con campos pendientes. Usa «Con alertas» para revisarlas.',
                         f'{pending} rows have fields to review. Use “With alerts” to find them.'))
    else:
        st.success(texto('No quedan campos inválidos ni lecturas de baja confianza sin corregir.',
                         'No invalid fields or unchanged low-confidence readings remain.'))
    st.caption(texto('Los filtros afectan la vista. Se importan todas las filas del borrador, incluidas las ocultas.',
                     'Filters affect the view. All draft rows are imported, including hidden rows.'))
    return [dict(entry['values']) for entry in entries]
