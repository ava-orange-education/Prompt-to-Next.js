import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import AISalesChart from "@/components/AIChart";
import SalesChart from "@/components/Chart";

type Product = { id: number; title: string; price: number; image: string };

const products: Product[] = [
  {
    id: 1,
    title: "Wireless Headphones",
    price: 99.99,
    image: "/wireless-headphones.png",
  },
  {
    id: 2,
    title: "Smart Watch",
    price: 249.99,
    image: "/smartwatch-lifestyle.png",
  },
  { id: 3, title: "Laptop Stand", price: 49.99, image: "/laptop-stand.png" },
  { id: 4, title: "Coffee Mug", price: 19.99, image: "/simple-coffee-mug.png" },
  { id: 5, title: "Desk Lamp", price: 79.99, image: "/modern-desk-lamp.png" },
  {
    id: 6,
    title: "Bluetooth Speaker",
    price: 129.99,
    image: "/bluetooth-speaker.png",
  },
  {
    id: 7,
    title: "Phone Case",
    price: 24.99,
    image: "/colorful-phone-case-display.png",
  },
  {
    id: 8,
    title: "Wireless Charger",
    price: 39.99,
    image: "/wireless-charger.png",
  },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function ProductGridPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 text-balance">
            Our Products
          </h1>
          <p className="text-muted-foreground text-pretty">
            Discover our curated collection of premium products
          </p>
        </header>

        <main
          aria-label="Product Grid"
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </main>

        <section className="flex flex-wrap items-start gap-4 m-8">
          <AISalesChart />
          <SalesChart />
        </section>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article role="listitem" className="group">
      <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-square relative">
            <Image
              src={product.image || "/placeholder.svg"}
              alt={`Photo of ${product.title}`}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          </div>
          <div className="p-4">
            <h3
              id={`title-${product.id}`}
              className="font-semibold text-foreground mb-2 text-pretty"
            >
              {product.title}
            </h3>
            <p className="text-2xl font-bold text-primary">
              {currency.format(product.price)}
            </p>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
