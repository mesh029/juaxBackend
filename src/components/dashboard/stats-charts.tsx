"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardChartsProps = {
  rentalCount: number;
  bnbCount: number;
  stationCount: number;
};

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function DashboardCharts({ rentalCount, bnbCount, stationCount }: DashboardChartsProps) {
  const listingMix = [
    { name: "Rentals", value: rentalCount },
    { name: "BnB", value: bnbCount },
  ].filter((d) => d.value > 0);

  const serviceBars = [
    { service: "Keja", listings: rentalCount + bnbCount },
    { service: "FUA", listings: stationCount },
    { service: "Rides", listings: 0 },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing mix</CardTitle>
          <CardDescription>Published Saka Keja inventory</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={listingMix}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
              >
                {listingMix.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services footprint</CardTitle>
          <CardDescription>Active pins across Jua X</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceBars}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="service" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="listings" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
