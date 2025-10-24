import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

const Label = React.forwardRef(function Label({ className, ...props }, ref) {
  const baseClasses = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <LabelPrimitive.Root
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label }


