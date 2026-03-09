import type React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, Package, DollarSign, Users } from "lucide-react";

type Product = {
  id: number;
  title: string;
  price: number;
  image: string;
  sales: number;
};

const products: Product[] = [
  {
    id: 1,
    title: "Wireless Headphones",
    price: 99.99,
    image: "/wireless-headphones.png",
    sales: 245,
  },
  {
    id: 2,
    title: "Smart Watch",
    price: 249.99,
    image: "/smartwatch-lifestyle.png",
    sales: 189,
  },
  {
    id: 3,
    title: "Laptop Stand",
    price: 49.99,
    image: "/laptop-stand.png",
    sales: 156,
  },
  {
    id: 4,
    title: "Coffee Mug",
    price: 19.99,
    image: "/simple-coffee-mug.png",
    sales: 324,
  },
  {
    id: 5,
    title: "Desk Lamp",
    price: 79.99,
    image: "/modern-desk-lamp.png",
    sales: 98,
  },
  {
    id: 6,
    title: "Bluetooth Speaker",
    price: 129.99,
    image: "/bluetooth-speaker.png",
    sales: 167,
  },
  {
    id: 7,
    title: "Phone Case",
    price: 24.99,
    image: "/colorful-phone-case-display.png",
    sales: 278,
  },
  {
    id: 8,
    title: "Wireless Charger",
    price: 39.99,
    image: "/wireless-charger.png",
    sales: 134,
  },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const salesData = [
  { month: "Jan", sales: 12400, revenue: 24800 },
  { month: "Feb", sales: 15600, revenue: 31200 },
  { month: "Mar", sales: 18200, revenue: 36400 },
  { month: "Apr", sales: 16800, revenue: 33600 },
  { month: "May", sales: 21500, revenue: 43000 },
  { month: "Jun", sales: 19300, revenue: 38600 },
];

export default function Dashboard() {
  const totalRevenue = products.reduce(
    (sum, product) => sum + product.price * product.sales,
    0
  );
  const totalSales = products.reduce((sum, product) => sum + product.sales, 0);
  const totalProducts = products.length;
  const avgOrderValue = totalRevenue / totalSales;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 text-balance">
            Sales Dashboard
          </h1>
          <p className="text-muted-foreground text-pretty">
            Monitor your business performance and product analytics
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={currency.format(totalRevenue)}
            icon={<DollarSign className="h-4 w-4" />}
            trend="+12.5%"
          />
          <MetricCard
            title="Total Sales"
            value={totalSales.toLocaleString()}
            icon={<TrendingUp className="h-4 w-4" />}
            trend="+8.2%"
          />
          <MetricCard
            title="Products"
            value={totalProducts.toString()}
            icon={<Package className="h-4 w-4" />}
            trend="+2"
          />
          <MetricCard
            title="Avg Order Value"
            value={currency.format(avgOrderValue)}
            icon={<Users className="h-4 w-4" />}
            trend="+4.1%"
          />
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>
                Monthly sales and revenue trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesChart data={salesData} />
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Top Products
              </h2>
              <p className="text-muted-foreground">
                Best performing products this month
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products
              .sort((a, b) => b.sales - a.sales)
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
          </div>
          <span className="text-sm text-green-600 font-medium">{trend}</span>
        </div>
        <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-square relative">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={`Photo of ${product.title}`}
            fill
            className="object-cover transition-transform duration-200 hover:scale-105"
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-2 text-pretty">
            {product.title}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-primary">
              {currency.format(product.price)}
            </p>
            <p className="text-sm text-muted-foreground">
              {product.sales} sold
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SalesChart({ data }: { data: typeof salesData }) {
  const maxSales = Math.max(...data.map((d) => d.sales));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-64 gap-2">
        {data.map((item, index) => (
          <div key={item.month} className="flex flex-col items-center flex-1">
            <div className="w-full bg-muted rounded-t-sm relative">
              <div
                className="bg-primary rounded-t-sm transition-all duration-500 ease-out"
                style={{
                  height: `${(item.sales / maxSales) * 200}px`,
                  minHeight: "8px",
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">{item.month}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-sm" />
          <span className="text-muted-foreground">Sales</span>
        </div>
      </div>
    </div>
  );
}
