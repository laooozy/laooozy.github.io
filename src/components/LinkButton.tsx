import { Button } from "@/components/ui/button";

interface LinkButtonProps {
  href: string;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "xs";
}

// Renders the shadcn/ui Button as an anchor. Kept as a React component because
// Base UI's `render` prop takes a JSX element, which Astro's template syntax
// cannot express inline.
export default function LinkButton({
  href,
  label,
  variant = "outline",
  size = "sm",
}: LinkButtonProps) {
  return (
    <Button render={<a href={href} />} variant={variant} size={size}>
      {label}
    </Button>
  );
}
