import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useEntityList(entity, queryParams = {}) {
  return useQuery({
    queryKey: ['records', entity, queryParams],
    queryFn: () => api.get('records.list', { ...queryParams, entity }),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveEntity(entity) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values) => {
      const { id, ...recordValues } = values;
      return api.post(id ? 'records.update' : 'records.create', {
        entity,
        ...(id ? { id } : {}),
        values: recordValues,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', entity] });
    },
  });
}
