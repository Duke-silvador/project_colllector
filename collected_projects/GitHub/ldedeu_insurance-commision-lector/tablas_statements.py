"""Filtros y paginación compartidos para todos los statements."""
import hashlib
import pandas as pd
import streamlit as streamlit
from idiomas import texto


def pagina_tabla(rows, key, st):
    fields = list(dict.fromkeys(field for row in rows for field in row if not field.startswith('_')))
    page_key = 'statement_page_' + key
    st.session_state.setdefault(page_key, 1)
    def reset():
        st.session_state[page_key] = 1
    areas = st.columns([2, 3])
    all_fields = texto('Todos los campos', 'All fields')
    field = areas[0].selectbox(texto('Buscar en', 'Search in'), [all_fields] + fields,
                              key='statement_field_' + key, on_change=reset)
    search = areas[1].text_input(texto('Buscar en la tabla', 'Search table'),
                                key='statement_search_' + key, on_change=reset).strip().casefold()
    table_container = st.container()
    controls = st.columns([2, 2, 3])
    size = controls[0].selectbox(texto('Filas por página', 'Rows per page'), [10, 25, 50, 100], index=1,
                              key='statement_size_' + key, on_change=reset)
    visible = [i for i, row in enumerate(rows) if not search or any(
        search in str(row.get(f) if row.get(f) is not None else '').casefold()
        for f in (fields if field == all_fields else [field]))]
    pages = max(1, (len(visible) + size - 1) // size)
    st.session_state[page_key] = min(max(1, st.session_state[page_key]), pages)
    page = controls[1].number_input(texto('Página', 'Page'), min_value=1, max_value=pages, step=1, key=page_key)
    start = (page - 1) * size
    selected = visible[start:start + size]
    controls[2].caption(texto(f'{start + 1 if visible else 0}–{min(start + size, len(visible))} de {len(visible)} filas filtradas; {len(rows)} en total. Página {page}/{pages}.',
                     f'{start + 1 if visible else 0}–{min(start + size, len(visible))} of {len(visible)} filtered rows; {len(rows)} total. Page {page}/{pages}.'))
    identity = hashlib.sha256(repr((field, search, size, page, selected)).encode()).hexdigest()
    return selected, identity, table_container


def mostrar_tabla(rows, key, st=None):
    st = st if st is not None else streamlit
    selected, _, table_container = pagina_tabla(rows, key, st)
    fields = list(dict.fromkeys(field for row in rows for field in row))
    with table_container:
        st.dataframe(pd.DataFrame([rows[i] for i in selected], columns=fields), hide_index=True, width='stretch')


def editar_tabla(rows, key, disabled, column_config, st=None):
    st = st if st is not None else streamlit
    draft_key = 'statement_edit_draft_' + key
    version_key = 'statement_edit_version_' + key
    st.session_state.setdefault(draft_key, [dict(row) for row in rows])
    st.session_state.setdefault(version_key, 0)
    draft = st.session_state[draft_key]
    selected, identity, table_container = pagina_tabla(draft, key, st)
    editor_key = f'statement_edit_{key}_{identity}_{st.session_state[version_key]}'
    fields = list(dict.fromkeys(field for row in rows for field in row))
    def save():
        changes = st.session_state[editor_key]
        for position, values in changes.get('edited_rows', {}).items():
            for field, value in values.items():
                if field in fields and field not in disabled:
                    draft[selected[int(position)]][field] = value
        deleted = {selected[int(i)] for i in changes.get('deleted_rows', [])}
        draft[:] = [row for i, row in enumerate(draft) if i not in deleted]
        for values in changes.get('added_rows', []):
            draft.append({field: values.get(field) for field in fields})
        st.session_state[version_key] += 1
    with table_container:
        st.data_editor(pd.DataFrame([draft[i] for i in selected], columns=fields), num_rows='dynamic',
                       width='stretch', hide_index=True, disabled=disabled, column_config=column_config,
                       key=editor_key, on_change=save)
    st.caption(texto('Los filtros afectan la vista; se procesan todas las filas.',
                     'Filters affect the view; all rows are processed.'))
    return [dict(row) for row in draft]
