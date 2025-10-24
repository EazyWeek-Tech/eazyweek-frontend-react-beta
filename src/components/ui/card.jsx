import * as React from "react"

const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  const baseClasses = "rounded-lg border bg-card text-card-foreground shadow-sm"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <div
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef(function CardHeader({ className, ...props }, ref) {
  const baseClasses = "flex flex-col space-y-1.5 p-6"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <div
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(function CardTitle({ className, ...props }, ref) {
  const baseClasses = "text-2xl font-semibold leading-none tracking-tight"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <h3
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(function CardDescription({ className, ...props }, ref) {
  const baseClasses = "text-sm text-muted-foreground"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <p
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(function CardContent({ className, ...props }, ref) {
  const baseClasses = "p-6 pt-0"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return <div ref={ref} className={classes} {...props} />
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(function CardFooter({ className, ...props }, ref) {
  const baseClasses = "flex items-center p-6 pt-0"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <div
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }


