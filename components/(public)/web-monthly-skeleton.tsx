import React from "react";
import SectionTitle from "../ui/section-title";
import { Skeleton } from "../ui/skeleton.web";

const WebMonthlySkeleton = () => {
  return (
    <div className="mb-16">
      <SectionTitle platform="web" title="Pizza del mese" />
      
      <div className="w-full h-full flex flex-col sm:flex-row items-start gap-4 bg-white rounded-xl rounded-l-3xl shadow-sm shadow-black/10 border border-gray-200">
        <Skeleton className="w-full sm:w-1/2 min-h-80 rounded-t-3xl sm:rounded-tr-none sm:rounded-l-3xl" />
        <div className="flex flex-col gap-2 w-full items-start justify-between p-4 sm:p-10 sm:pl-4">
          <div className="flex flex-row items-start justify-between w-full pr-4">
            <div className="flex flex-col items-start gap-2 flex-1">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-8 w-20 ml-4" />
          </div>
          <Skeleton className="h-10 w-24 ml-auto mt-4" />
        </div>
      </div>
    </div>
  );
};

export default WebMonthlySkeleton; 