# Governance

`members.json` records each member's trust level (decision 0007; concept §11) and the accounts a
PDC coordinator has linked to them, which are one member for every rule. Divlab reads it when a member claims a task. A
member it does not list is *new*.

Only PDC coordinators change it, through a reviewed pull request to this repository, so every
change is visible and passes the pipeline. Each entry is a GitHub account name and its level:

```json
{ "members": { "account-name": { "level": "established", "linked": ["second-account"] } } }
```

An account may be linked to one member only; CI checks that, and that every level is one
Anarres has.

The levels, lowest first, and what each may take, are defined once, in `packages/core`.
