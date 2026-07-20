import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const workspaceVariants = cva(
  "group relative rounded-xl border bg-white p-4.5 transition-all duration-250 hover:shadow-md flex items-start justify-between border-l-4",
  {
    variants: {
      stream: {
        general: "border-slate-200 border-l-slate-400",
        jee: "bg-track-bg-jee border-slate-150 border-l-brand-purple hover:border-brand-purple/40",
        neet: "bg-track-bg-neet border-slate-150 border-l-brand-peach hover:border-brand-peach/40",
        centre: "bg-track-bg-centre border-slate-150 border-l-brand-mint hover:border-brand-mint/40",
      }
    },
    defaultVariants: {
      stream: "general",
    }
  }
);

export interface WorkspaceCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof workspaceVariants> {}

export function WorkspaceCard({ className, stream, ...props }: WorkspaceCardProps) {
  return <div className={cn(workspaceVariants({ stream }), className)} {...props} />;
}
