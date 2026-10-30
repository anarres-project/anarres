To hand work over, write its feedback signal in the task's folder with `status: partial`, and
under its header a handover note saying what is done, what is left, and anything the next member
should know. Then submit it, giving the task's name, without `--draft`:

```
node ${CLAUDE_PLUGIN_ROOT}/cli/anarres.js submit project#number
```

Divlab merges what is there and posts the task again for someone to continue (decision 0008).
Handing over gives the task back: there is nothing more to release.
