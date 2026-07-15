import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export function useInspectionTables() {
  return useQuery({
    queryKey: ["inspection_tables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspection_tables").select("*").order("no_meja");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useParts() {
  return useQuery({
    queryKey: ["parts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parts").select("*").order("part_name");
      if (error) throw error;
      return (data ?? []) as Tables<"parts">[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDefectTypes(activeOnly = false) {
  return useQuery({
    queryKey: ["defect_types", activeOnly],
    queryFn: async () => {
      let q = supabase.from("defect_types").select("*").order("urutan", { ascending: true });
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTableDefaultParts(noMeja: number | null) {
  return useQuery({
    queryKey: ["table-default-parts", noMeja],
    queryFn: async () => {
      if (noMeja == null) return [];
      const { data, error } = await supabase
        .from("inspection_table_default_parts")
        .select("part_no")
        .eq("no_meja", noMeja);
      if (error) throw error;
      return (data ?? []).map((r) => r.part_no);
    },
    enabled: noMeja != null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDefaultPartsByTable() {
  return useQuery({
    queryKey: ["default-parts-by-table"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_table_default_parts")
        .select("no_meja, part_no")
        .order("no_meja");
      if (error) throw error;
      const map = new Map<number, string[]>();
      for (const r of data ?? []) {
        const list = map.get(r.no_meja) ?? [];
        list.push(r.part_no);
        map.set(r.no_meja, list);
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}
