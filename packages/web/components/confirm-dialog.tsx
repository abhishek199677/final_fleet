import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { BorderButton } from '@/components/ui/border-button'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  disabled?: boolean
  desc: React.JSX.Element | string
  cancelBtnText?: string
  confirmText?: React.ReactNode
  destructive?: boolean
  isLoading?: boolean
  className?: string
  children?: React.ReactNode
} & (
  | { form: string; handleConfirm?: undefined }
  | { form?: undefined; handleConfirm: () => void }
)

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    title,
    desc,
    children,
    className,
    confirmText,
    cancelBtnText,
    destructive,
    isLoading,
    disabled = false,
    form,
    handleConfirm,
    ...actions
  } = props

  const isDeleteConfirm =
    destructive &&
    typeof confirmText === 'string' &&
    confirmText.trim().toLowerCase() === 'delete'
  return (
    <AlertDialog {...actions}>
      <AlertDialogContent className={cn(className && className)}>
        <AlertDialogHeader className='text-start'>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{desc}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelBtnText ?? 'Cancel'}
          </AlertDialogCancel>
          {isDeleteConfirm ? (
            /* Delete confirmations use the outlined pill (see BorderButton),
               every other confirmation keeps the standard button. */
            <BorderButton
              type={form ? 'submit' : 'button'}
              form={form}
              onClick={handleConfirm}
              tone='destructive'
              size='full'
              loading={isLoading}
              disabled={disabled}
            >
              {confirmText ?? 'Continue'}
            </BorderButton>
          ) : (
            <Button
              type={form ? 'submit' : 'button'}
              form={form}
              onClick={handleConfirm}
              variant={destructive ? 'destructive' : 'default'}
              disabled={disabled || isLoading}
            >
              {confirmText ?? 'Continue'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
