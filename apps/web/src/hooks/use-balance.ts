"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useBalance() {
  return useQuery(orpc.points.get.queryOptions({}));
}
