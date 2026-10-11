import { useQuery } from '@tanstack/react-query';
import { fetchApiHealth, fetchDistricts } from './api';

export const worldKeys = {
  districts: ['world', 'districts'] as const,
  apiHealth: ['platform', 'health'] as const,
};

export function useDistricts() {
  return useQuery({
    queryKey: worldKeys.districts,
    queryFn: ({ signal }) => fetchDistricts(signal),
    refetchInterval: 30_000,
    retry: 2,
  });
}

export function useApiHealth() {
  return useQuery({
    queryKey: worldKeys.apiHealth,
    queryFn: ({ signal }) => fetchApiHealth(signal),
    refetchInterval: 15_000,
    retry: false,
  });
}
