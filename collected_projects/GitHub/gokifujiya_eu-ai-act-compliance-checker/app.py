from copy import deepcopy

import gradio as gr

from src.compliance_engine import (
    determine_next,
    load_rules,
    update_state,
)
from src.legal_text import get_obligation_provision


RULES = load_rules()


def new_state():
    """Create a fresh compliance assessment."""
    return {
        "answers": {},
        "original_entity": None,
        "current_entity": None,
        "status_changes": [],
        "obligations": [],
        "legal_basis": [],
        "current_question": "E1",
        "history": [],
        "finished": False,
    }


def get_question_data(question_id, state):
    """Return questionnaire data with entity-specific options filtered."""
    question_data = RULES[question_id].copy()

    if question_id in ("S1", "R4"):
        current_entity = state["current_entity"]

        question_data["options"] = {
            key: option_data
            for key, option_data in question_data["options"].items()
            if (
                "applies_to" not in option_data
                or current_entity in option_data["applies_to"]
            )
        }

    return question_data


def is_multiple_choice(question_id, question_data):
    """Return whether the current filtered question allows multiple answers."""
    if question_data["type"] != "multiple_choice":
        return False

    if question_id == "S1":
        positive_options = [
            key
            for key in question_data["options"]
            if key != "none"
        ]

        if len(positive_options) == 1:
            return False

    return True


def render_question(state):
    """Render the current questionnaire node."""
    question_id = state["current_question"]
    question_data = get_question_data(question_id, state)

    options = [
        option_data["label"]
        for option_data in question_data["options"].values()
    ]

    multiple = is_multiple_choice(question_id, question_data)

    heading = (
        f"## {question_data['section']}\n"
        f"**{question_id} — {question_data['question']}**"
    )

    guidance = question_data.get("guidance", [])

    if guidance:
        heading += "\n\n**Guidance**\n"
        heading += "\n".join(
            f"- {item}" for item in guidance
        )

    if multiple:
        radio_update = gr.update(
            choices=[],
            value=None,
            visible=False,
        )
        checkbox_update = gr.update(
            choices=options,
            value=[],
            visible=True,
        )
    else:
        radio_update = gr.update(
            choices=options,
            value=None,
            visible=True,
        )
        checkbox_update = gr.update(
            choices=[],
            value=[],
            visible=False,
        )

    return (
        heading,
        radio_update,
        checkbox_update,
        gr.update(visible=True),
    )


def render_result(state):
    """Create the final assessment report."""
    if not (
        state["original_entity"]
        or state["current_entity"]
        or state["status_changes"]
        or state["obligations"]
        or state["legal_basis"]
    ):
        return (
            "## Assessment\n\n"
            "Complete the questionnaire to see your result."
        )

    lines = ["# Assessment Result"]

    if state["original_entity"]:
        lines.append(
            f"\n**Original entity:** "
            f"{state['original_entity'].replace('_', ' ').title()}"
        )

    if state["current_entity"]:
        lines.append(
            f"\n**Current entity:** "
            f"{state['current_entity'].replace('_', ' ').title()}"
        )

    if state["status_changes"]:
        lines.append("\n## Classification / Status")

        for status in state["status_changes"]:
            lines.append(f"- **{status}**")

    if state["obligations"]:
        lines.append("\n## Applicable Obligations")

        for obligation in state["obligations"]:
            provision = get_obligation_provision(obligation)

            if provision is None:
                lines.append(f"- **{obligation}**")
            else:
                lines.append(
                    f"- **{obligation}** — {provision['reference']}"
                )

    if state["legal_basis"]:
        lines.append("\n## Relevant Legal References")

        for source in state["legal_basis"]:
            lines.append(f"- {source}")

    lines.append(
        "\n---\n"
        "*This automated assessment is intended as a preliminary "
        "compliance aid and does not constitute legal advice.*"
    )

    return "\n".join(lines)


def render_legal_evidence(state):
    """Show precise statutory text for mapped obligations."""
    sections = []

    for obligation in state["obligations"]:
        provision = get_obligation_provision(obligation)

        if provision is None:
            continue

        text = provision["text"]

        sections.append(
            f"### {obligation}\n"
            f"**{provision['reference']}**\n\n"
            f"{text}"
        )

    if not sections:
        return (
            "## Legal Evidence\n\n"
            "*No paragraph-level statutory text is mapped "
            "for the current obligations.*"
        )

    return "## Legal Evidence\n\n" + "\n\n---\n\n".join(sections)


def submit_answer(single_selection, multiple_selection, state):
    """Process one questionnaire answer and advance the assessment."""
    if state is None:
        state = new_state()

    question_id = state["current_question"]
    question_data = get_question_data(question_id, state)

    if is_multiple_choice(question_id, question_data):
        selected_labels = multiple_selection or []
    else:
        selected_labels = (
            [single_selection]
            if single_selection
            else []
        )

    if not selected_labels:
        raise gr.Error("Please select at least one option.")

    label_to_option = {
        option_data["label"]: (key, option_data)
        for key, option_data in question_data["options"].items()
    }

    selected = [
        label_to_option[label]
        for label in selected_labels
    ]

    selected_keys = [key for key, _ in selected]

    if "none" in selected_keys and len(selected_keys) > 1:
        raise gr.Error(
            "'None of the above' cannot be combined with another option."
        )

    state["history"].append(deepcopy({
        "answers": state["answers"],
        "original_entity": state["original_entity"],
        "current_entity": state["current_entity"],
        "status_changes": state["status_changes"],
        "obligations": state["obligations"],
        "legal_basis": state["legal_basis"],
        "current_question": state["current_question"],
        "finished": state["finished"],
    }))

    update_state(
        question_id,
        selected,
        RULES,
        state,
    )

    next_question = determine_next(
        question_id,
        selected,
        state,
    )

    if next_question == "END":
        state["finished"] = True

        return (
            state,
            "## Assessment complete",
            gr.update(visible=False),
            gr.update(visible=False),
            gr.update(visible=False),
            gr.update(visible=True),
            render_result(state),
            render_legal_evidence(state),
        )

    if next_question is None or next_question not in RULES:
        raise gr.Error(
            f"Questionnaire branch '{next_question}' is not implemented."
        )

    state["current_question"] = next_question

    heading, radio, checkboxes, button = render_question(state)

    return (
        state,
        heading,
        radio,
        checkboxes,
        button,
        gr.update(visible=True),
        render_result(state),
        render_legal_evidence(state),
    )


def go_back(state):
    """Return to the previous questionnaire state."""
    if state is None or not state.get("history"):
        raise gr.Error("There is no previous question.")

    history = state["history"]
    previous_state = history.pop()

    state = deepcopy(previous_state)
    state["history"] = history
    state["finished"] = False

    heading, radio, checkboxes, button = render_question(state)

    return (
        state,
        heading,
        radio,
        checkboxes,
        button,
        gr.update(
            visible=state["current_question"] != "E1"
        ),
        render_result(state),
        render_legal_evidence(state),
    )


def restart():
    """Restart the assessment."""
    state = new_state()

    heading, radio, checkboxes, button = render_question(state)

    return (
        state,
        heading,
        radio,
        checkboxes,
        button,
        gr.update(visible=False),
        "## Assessment\n\nComplete the questionnaire to see your result.",
        "## Legal Evidence\n\nRelevant statutory text will appear here.",
    )


def main():
    initial_state = new_state()
    heading, radio_update, checkbox_update, button = render_question(
        initial_state
    )

    theme = gr.themes.Soft(
        font=["Inter", "system-ui", "sans-serif"]
    )

    with gr.Blocks(
        title="EU AI Act Compliance Checker",
        theme=theme,
    ) as app:
        gr.Markdown(
            "# EU AI Act Compliance Checker\n"
            "A rule-based preliminary assessment under "
            "Regulation (EU) 2024/1689."
        )

        state = gr.State(initial_state)

        with gr.Row():
            with gr.Column(scale=1):
                question = gr.Markdown(heading)

                single_answer = gr.Radio(
                    choices=radio_update["choices"],
                    value=None,
                    label="Select one answer",
                    visible=radio_update["visible"],
                )

                multiple_answer = gr.CheckboxGroup(
                    choices=checkbox_update["choices"],
                    value=[],
                    label="Select one or more answers",
                    visible=checkbox_update["visible"],
                )

                submit = gr.Button(
                    "Continue",
                    variant="primary",
                )

                with gr.Row():
                    back_button = gr.Button("← Back", visible=False)
                    restart_button = gr.Button("Restart assessment")

            with gr.Column(scale=1):
                result = gr.Markdown(
                    "## Assessment\n\n"
                    "Complete the questionnaire to see your result."
                )

                evidence = gr.Markdown(
                    "## Legal Evidence\n\n"
                    "Relevant statutory text will appear here."
                )

        submit.click(
            submit_answer,
            inputs=[
                single_answer,
                multiple_answer,
                state,
            ],
            outputs=[
                state,
                question,
                single_answer,
                multiple_answer,
                submit,
                back_button,
                result,
                evidence,
            ],
        )

        back_button.click(
            go_back,
            inputs=[state],
            outputs=[
                state,
                question,
                single_answer,
                multiple_answer,
                submit,
                back_button,
                result,
                evidence,
            ],
        )

        restart_button.click(
            restart,
            outputs=[
                state,
                question,
                single_answer,
                multiple_answer,
                submit,
                back_button,
                result,
                evidence,
            ],
        )

    app.launch(inbrowser=True)


if __name__ == "__main__":
    main()
