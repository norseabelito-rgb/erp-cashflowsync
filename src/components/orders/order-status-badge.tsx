"use client";

import { Badge } from "@/components/ui/badge";

interface InternalOrderStatus {
  id: string;
  name: string;
  color: string;
}

interface OrderStatusBadgeProps {
  status: InternalOrderStatus | null | undefined;
  className?: string;
}

// Calculate text color based on background color luminance
function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Use white text for dark backgrounds, black for light
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  if (!status) {
    return null;
  }

  const textColor = getContrastTextColor(status.color);

  return (
    <Badge
      className={className}
      style={{
        backgroundColor: status.color,
        color: textColor,
        borderColor: status.color,
      }}
    >
      {status.name}
    </Badge>
  );
}

// Color preview component for settings page
interface ColorPreviewProps {
  color: string;
  size?: "sm" | "md";
}

export function ColorPreview({ color, size = "md" }: ColorPreviewProps) {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div
      className={`${sizeClass} rounded border`}
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}
