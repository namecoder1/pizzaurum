import { groupDaysBySchedule } from '@/lib/utils';
import { OpenDaysProps } from '@/types/types';
import React from 'react'

const OpenDays = ({ openDays, openDaysLoading, variant = "default" }: { openDays: OpenDaysProps[], openDaysLoading: boolean, variant?: "default" | "compact" }) => {
  if (openDaysLoading) return null;
  if (openDays.length === 0) return null;
  
  const groups = groupDaysBySchedule(openDays);
  
  return groups.map((group, index) => {
    const dayRange = group.days.length === 1 
      ? group.days[0] 
      : `${group.days[0]} - ${group.days[group.days.length - 1]}`;
    
    if (variant !== "compact") {
      return (
        <div key={`group-${index}`} className="mb-4">
          <p className="text-sm/6 text-balance text-gray-600 font-medium">{dayRange}</p>
          <p className="text-sm/6 text-balance text-gray-600 ml-2">- {group.schedule}</p>
        </div>
      );
    }

    return (
      <div key={`group-${index}`} className="flex">
        <p className="text-sm/6 text-balance text-gray-600 font-medium">{dayRange}</p>
        <p className="text-sm/6 text-balance text-gray-600 ml-2">- {group.schedule}</p>
      </div>
    );
  });
}

export default OpenDays