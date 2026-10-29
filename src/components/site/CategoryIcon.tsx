import { BagIcon, BoxIcon, CartonIcon, CupIcon, FoodIcon, GiftIcon, MailerIcon, SparkIcon } from "@/components/ui";

const MAP: Record<string, typeof BoxIcon> = {
  "shipping-boxes": BoxIcon,
  "mailer-boxes": MailerIcon,
  "folding-cartons": CartonIcon,
  "gift-boxes": GiftIcon,
  "food-packaging": FoodIcon,
  "paper-cups": CupIcon,
  "paper-bags": BagIcon,
  "stickers-labels": SparkIcon,
  "wrapping-paper": GiftIcon,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = MAP[slug] ?? SparkIcon;
  return <Icon className={className} />;
}
