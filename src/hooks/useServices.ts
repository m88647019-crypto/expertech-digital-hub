import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const db = createClient(supabaseUrl, supabaseKey);

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface RequiredField {
  label: string;
  hint?: string;
  required?: boolean;
}

export interface Service {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  payment_timing: "pay_first" | "pay_after";
  is_active: boolean;
  sort_order: number;
  requires_details: boolean;
  detail_hint: string | null;
  required_fields?: RequiredField[] | null;
}

export interface ServiceRequest {
  id: string;
  service_id: string | null;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  branch: string;
  details: string | null;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  price: number;
  paid: boolean;
  payment_method: string | null;
  payment_reference: string | null;
  admin_notes: string | null;
  discount_amount?: number;
  discount_reason?: string | null;
  discount_approved?: boolean;
  discount_approved_by?: string | null;
  discount_approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function useServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("service_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    setCategories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { categories, loading, refetch: fetchData };
}

export function useServicesAdmin() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });
    setServices(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { services, loading, refetch: fetchData };
}

export function useActiveServices() {
  const [services, setServices] = useState<(Service & { category_name?: string })[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [catRes, svcRes] = await Promise.all([
        db.from("service_categories").select("*").eq("is_active", true).order("sort_order"),
        db.from("services").select("*").eq("is_active", true).order("sort_order"),
      ]);
      const cats: ServiceCategory[] = catRes.data || [];
      const svcs: Service[] = svcRes.data || [];
      const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
      setCategories(cats);
      setServices(svcs.map((s) => ({ ...s, category_name: catMap[s.category_id || ""] || "Other" })));
      setLoading(false);
    })();
  }, []);

  return { services, categories, loading };
}

export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = db
      .channel("service-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [fetchData]);

  const updateRequest = async (id: string, updates: Partial<ServiceRequest>) => {
    const { error } = await db.from("service_requests").update(updates).eq("id", id);
    if (!error) fetchData();
    return { error };
  };

  const deleteRequest = async (id: string) => {
    const { error } = await db.from("service_requests").delete().eq("id", id);
    if (!error) fetchData();
    return { error };
  };

  return { requests, loading, refetch: fetchData, updateRequest, deleteRequest };
}
