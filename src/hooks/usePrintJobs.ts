import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { PrintJob, JobStatus } from "@/types/printJob";

interface Filters {
  search: string;
  status: string;
  branch: string;
  dateFrom: string;
  dateTo: string;
}

export function usePrintJobs() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    branch: "all",
    dateFrom: "",
    dateTo: "",
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("print_jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.branch && filters.branch !== "all") {
      query = query.eq("branch", filters.branch);
    }
    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo + "T23:59:59");
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (!error) setJobs(data || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("print-jobs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "print_jobs" }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchJobs]);

  const updateJob = async (id: string, updates: Partial<PrintJob>) => {
    const { error } = await supabase.from("print_jobs").update(updates).eq("id", id);
    if (!error) fetchJobs();
    return { error };
  };

  const deleteJob = async (id: string) => {
    const { error } = await supabase.from("print_jobs").delete().eq("id", id);
    if (!error) fetchJobs();
    return { error };
  };

  const deleteJobs = async (ids: string[]) => {
    const { error } = await supabase.from("print_jobs").delete().in("id", ids);
    if (!error) fetchJobs();
    return { error };
  };

  const bulkUpdateStatus = async (ids: string[], status: JobStatus) => {
    const { error } = await supabase.from("print_jobs").update({ status }).in("id", ids);
    if (!error) fetchJobs();
    return { error };
  };

  return { jobs, loading, filters, setFilters, fetchJobs, updateJob, deleteJob, deleteJobs, bulkUpdateStatus };
}
