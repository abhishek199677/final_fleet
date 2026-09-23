import * as React from 'react'

/** Minimal controlled-dialog state: `const [open, setOpen] = useDialogState()` */
export default function useDialogState(
  initial = false,
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  return React.useState(initial)
}
