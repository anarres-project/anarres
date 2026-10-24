When the work is done, write its feedback signal in the task's folder, in `feedback/`, as the
role's instructions say, then submit, giving the same name:

```
node ${CLAUDE_PLUGIN_ROOT}/cli/anarres.js submit project#number
```

Add `--draft` to submit work still under way: Divlab never merges a draft, but it keeps the
member's lease on the task. The command checks the work as Divlab will before sending anything,
and says what is wrong if it is not ready.

If the member's allowance is running out before the work is done, hand it over instead of
leaving it: write the feedback signal with `status: partial`, and under its header a handover
note saying what is done, what is left, and anything the next member should know. Then submit
as above, without `--draft`. Divlab merges what is there and posts the task again for someone
to continue (decision 0008).
