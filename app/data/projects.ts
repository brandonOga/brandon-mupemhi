export type Project = {
  slug: string;
  name: string;
  image: string;
  description: string;
  url?: string;
};

export const projects: Project[] = [
  { slug: "ferrari", name: "Ferrari", image: "/images/ferrari.jpg", description: "Premium automotive design" },
  { slug: "alfa-romeo", name: "Alfa Romeo", image: "/images/alfa-romeo.jpg", description: "Timeless Italian elegance" },
  { slug: "red-bull", name: "Red Bull", image: "/images/red-bull.jpg", description: "Dynamic brand presence" },
  { slug: "aston-martin", name: "Aston Martin", image: "/images/aston-martin.jpg", description: "Luxury craftsmanship" },
  { slug: "mercedes", name: "Mercedes", image: "/images/mercedes.jpg", description: "Engineering excellence" },
];
