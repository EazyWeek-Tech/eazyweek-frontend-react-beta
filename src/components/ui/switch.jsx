import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import "./Switch.css"; // Import the external CSS file

const Switch = React.forwardRef(function Switch({ className, ...props }, ref) {
  // Combine base class with any additional className
  const classes = ["switch", className].filter(Boolean).join(" ");

  return (
    <SwitchPrimitives.Root
      className={classes}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb className="switch-thumb" />
    </SwitchPrimitives.Root>
  );
});

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };