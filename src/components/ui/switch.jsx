import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import "./switch.css"; // Import the external CSS file

const Switch = React.forwardRef(function Switch({ className, ...props }, ref) {
  // Combine base class with any additional className
  const classes = ["AdvFormBuilder-switch", className].filter(Boolean).join(" ");

  return (
    <SwitchPrimitives.Root
      className={classes}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb className="AdvFormBuilder-switch-thumb" />
    </SwitchPrimitives.Root>
  );
});

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };