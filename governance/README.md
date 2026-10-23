# Governance

`members.json` records each member's trust level (decision 0007; concept §11), and in time the
accounts a PDC coordinator has linked to them. Divlab reads it when a member claims a task. A
member it does not list is *new*.

Only PDC coordinators change it, through a reviewed pull request to this repository, so every
change is visible and passes the pipeline. Each entry is a GitHub account name and its level:

```json
{ "members": { "account-name": { "level": "established" } } }
```

The levels, lowest first, and what each may take, are defined once, in `packages/core`.
