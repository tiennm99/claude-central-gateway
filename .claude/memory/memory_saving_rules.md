---
name: Memory Saving Rules
description: Rules for saving and managing memories in this project
type: feedback
---

## How to Save Memories

Saving a memory is a two-step process:

**Step 1** — Write the memory to its own file (e.g., `user_role.md`, `feedback_testing.md`) using this frontmatter format:

```markdown
---
name: {{memory name}}
description: {{one-line description — used to decide relevance in future conversations}}
type: {{user, feedback, project, reference}}
---

{{memory content — for feedback/project types, structure as: rule/fact, then **Why:** and **How to apply:** lines}}
```

**Step 2** — Add a pointer to that file in `MEMORY.md`. `MEMORY.md` is an index — each entry should be one line, under ~150 characters: `- [Title](file.md) — one-line hook`.

## Memory Types

- **user**: Information about user's role, goals, preferences, and knowledge
- **feedback**: Guidance on how to approach work — what to avoid and what to keep doing
- **project**: Information about ongoing work, goals, initiatives, bugs, or incidents
- **reference**: Pointers to where information can be found in external systems

## What NOT to Save

- Code patterns, conventions, architecture (read from code instead)
- Git history (use `git log` / `git blame`)
- Debugging solutions (the fix is in the code)
- Anything already documented in CLAUDE.md files
- Ephemeral task details

**Why:** Memories should capture unique context not derivable from other sources.

**How to apply:** Before saving, ask: "Is this information available elsewhere?" If yes, don't save as memory.
