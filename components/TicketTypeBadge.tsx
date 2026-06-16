import React from 'react';
import { Layers, BookOpen, Bug, CheckSquare, Zap } from 'lucide-react';
import { TicketType, TICKET_TYPE_CONFIG } from '../types';

interface TicketTypeBadgeProps {
  type: TicketType;
  size?: 'sm' | 'md';
}

const ICONS: Record<TicketType, React.ReactNode> = {
  Epic:  <Layers  className="w-3 h-3" />,
  Story: <BookOpen className="w-3 h-3" />,
  Bug:   <Bug      className="w-3 h-3" />,
  Task:  <CheckSquare className="w-3 h-3" />,
  Spike: <Zap     className="w-3 h-3" />,
};

export const TicketTypeBadge: React.FC<TicketTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const cfg = TICKET_TYPE_CONFIG[type];
  const padding = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold ${padding} ${cfg.bgLight} ${cfg.textColor} ${cfg.borderColor} border`}
    >
      {ICONS[type]}
      {cfg.label}
    </span>
  );
};
