/**
 * Icons are stored as strings in the database (categories.icon, industries.icon)
 * so new industries can be added from /admin without code changes.
 * Add more Lucide icons to ICONS to make them selectable in the admin.
 */
import {
  Boxes, Camera, Cpu, Footprints, Gamepad2, HardDrive, Headphones, Joystick, Keyboard, Laptop,
  Microwave, Monitor, Mouse, Package, Printer, Refrigerator, Router, Shirt, ShoppingBag, Smartphone,
  Speaker, Tablet, Tv, WashingMachine, Watch, type LucideIcon, type LucideProps,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Gamepad2, Joystick, Cpu, Monitor, Headphones, Keyboard, Mouse, Laptop, HardDrive, Router, Printer,
  Smartphone, Tablet, Watch, Camera, Speaker, Tv, Refrigerator, WashingMachine, Microwave,
  Shirt, Footprints, ShoppingBag, Boxes, Package,
};

export const ICON_NAMES = Object.keys(ICONS);

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Package;
  return <Icon {...props} />;
}
