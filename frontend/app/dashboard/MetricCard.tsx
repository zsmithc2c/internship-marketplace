"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import CountUp from "react-countup";

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface MetricCardProps {
  icon: IconComponent;
  label: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

export default function MetricCard({
  icon: Icon,
  label,
  value,
  prefix = "",
  suffix = "",
  loading = false,
  children,
}: MetricCardProps) {
  return (
    <Card className="flex items-center p-4">
      <Icon className="h-6 w-6 text-[--accent-primary]" />
      <div className="ml-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">
          {loading ? (
            "…"
          ) : value !== undefined ? (
            <CountUp end={value} duration={1} separator="," prefix={prefix} suffix={suffix} />
          ) : (
            children
          )}
        </p>
      </div>
    </Card>
  );
}
