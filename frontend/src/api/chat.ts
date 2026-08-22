import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  ChatActionResult,
  ChatMessage,
  ChatSessionListResponse,
  ChatTurnResult,
} from './types';

export function useChatSessions() {
  return useQuery({
    queryKey: ['chatSessions'],
    queryFn: () => api.get<ChatSessionListResponse>('/chat/sessions'),
  });
}

export function useChatMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['chatMessages', sessionId],
    queryFn: () => api.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`),
    enabled: !!sessionId,
  });
}

// Starts a brand-new conversation (and, once accepted, a brand-new trip).
export function useStartChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.post<ChatTurnResult>('/chat/sessions', { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatSessions'] }),
  });
}

export function useSendChatMessage(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<ChatTurnResult>(`/chat/sessions/${sessionId}/messages`, { content }),
    onSuccess: (data) => {
      queryClient.setQueryData(['chatMessages', sessionId], (prev: ChatMessage[] | undefined) => [
        ...(prev ?? []),
        ...data.messages,
      ]);
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });
}

export function useAcceptChatAction(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.post<ChatActionResult>(`/chat/messages/${messageId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRejectChatAction(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.post<ChatMessage>(`/chat/messages/${messageId}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatMessages', sessionId] }),
  });
}
