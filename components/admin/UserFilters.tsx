"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";

export interface UserFiltersState {
  search: string;
  tier: "all" | "FREE" | "PRO";
  sort: "email" | "name" | "createdAt" | "tier";
}

interface UserFiltersProps {
  filters: UserFiltersState;
  onFiltersChange: (filters: UserFiltersState) => void;
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleTierChange = (value: string) => {
    onFiltersChange({
      ...filters,
      tier: value as UserFiltersState["tier"],
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sort: value as UserFiltersState["sort"],
    });
  };

  const handleClear = () => {
    onFiltersChange({
      search: "",
      tier: "all",
      sort: "email",
    });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.tier !== "all" ||
    filters.sort !== "email";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por email o nombre..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tier filter */}
      <Select value={filters.tier} onValueChange={handleTierChange}>
        <SelectTrigger className="w-full sm:w-32">
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="FREE">FREE</SelectItem>
          <SelectItem value="PRO">PRO</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={filters.sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="name">Nombre</SelectItem>
          <SelectItem value="tier">Membresía</SelectItem>
          <SelectItem value="createdAt">Fecha registro</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="gap-1"
        >
          <X className="h-3 w-3" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

export function applyUserFilters<
  T extends {
    email: string | null;
    name: string | null;
    membershipTier: "FREE" | "PRO";
  }
>(users: T[], filters: UserFiltersState): T[] {
  let filtered = [...users];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.email?.toLowerCase().includes(searchLower) ||
        u.name?.toLowerCase().includes(searchLower)
    );
  }

  // Tier filter
  if (filters.tier !== "all") {
    filtered = filtered.filter((u) => u.membershipTier === filters.tier);
  }

  // Sort
  filtered.sort((a, b) => {
    switch (filters.sort) {
      case "email":
        return (a.email ?? "").localeCompare(b.email ?? "");
      case "name":
        return (a.name ?? "").localeCompare(b.name ?? "");
      case "tier":
        return a.membershipTier.localeCompare(b.membershipTier);
      default:
        return 0;
    }
  });

  return filtered;
}
