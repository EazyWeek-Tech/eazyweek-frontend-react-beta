import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(function TabsList({ className, ...props }, ref) {
  const baseClasses = "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <TabsPrimitive.List
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  const baseClasses = ""
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={classes}
      style={{
        backgroundColor:' rgb(248, 243, 243)',
        color:' var(--text-primary)',
      }}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(function TabsContent({ className, ...props }, ref) {
  const baseClasses = "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const classes = [baseClasses, className].filter(Boolean).join(" ")

  return (
    <TabsPrimitive.Content
      ref={ref}
      className={classes}
      {...props}
    />
  )
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }


