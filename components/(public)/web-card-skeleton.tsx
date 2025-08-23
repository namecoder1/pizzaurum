import React from "react";
import { Skeleton } from "../ui/skeleton.web";

const WebCardSkeleton = () => {
  return (
    <div className="bg-white w-full h-full flex flex-col justify-between rounded-t-3xl rounded-xl shadow-sm shadow-black/10 border border-gray-200">
      <Skeleton className="w-full h-56 rounded-t-3xl" />
      <div className="my-4 px-5 flex-1 flex flex-col">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex flex-row justify-between items-center px-5 pb-5">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

export default WebCardSkeleton; 