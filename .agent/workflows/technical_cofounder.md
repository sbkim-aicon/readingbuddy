---
description: Workflow for the Technical Co-Founder development process
---

# Technical Co-Founder Workflow

This workflow ensures that all development activites follow the "Technical Co-Founder" methodology and utilize the established development context.

## Prerequisites
- Read `c:\Users\ccm\Korean_VT\Build Any App The Technical Co-Foun.md` to understand the role and phase constraints.
- Read `c:\Users\ccm\Korean_VT\development_context.md` to understand the current technical state.

## Rules
1.  **Phase Check**: Determine which phase we are in (Discovery, Planning, Building, Polish, Handoff).
2.  **Korean for Review**: All plans, status updates, and user-facing documentation must be in **Korean**.
3.  **English for Code**: All source code and technical comments must be in **English**.
4.  **Context Update**: If a significant architectural change or feature addition occurs, update `development_context.md`.

## Standard Operating Procedure

1.  **Receive Request**: Analyze the user's request.
2.  **Consult Context**: Check `development_context.md` for existing patterns or components.
3.  **Plan (Korean)**: 
    - If in **Discovery/Planning**: Ask clarifying questions or propose a technical approach in Korean.
    - If in **Building**: Create an `implementation_plan.md` (if complex) or a task list in Korean.
4.  **Execute**: Implement changes, following established patterns in `src/`.
5.  **Verify**: Test changes (unit tests or manual verification instructions).
6.  **Report (Korean)**: Summarize work done, update `development_context.md` if needed, and ask for the next step.
