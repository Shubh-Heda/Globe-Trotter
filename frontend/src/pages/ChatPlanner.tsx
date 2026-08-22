import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Send, X } from 'lucide-react';
import {
  useAcceptChatAction,
  useChatMessages,
  useRejectChatAction,
  useSendChatMessage,
  useStartChatSession,
} from '../api/chat';
import { ApiError, formatMoney } from '../api/client';
import type {
  AddActivityActionPayload,
  AddStopActionPayload,
  ChatMessage,
  CreateTripActionPayload,
} from '../api/types';

function proposalSummary(message: ChatMessage): { title: string; detail: string } {
  if (message.actionType === 'CREATE_TRIP') {
    const p = message.actionPayload as CreateTripActionPayload;
    return { title: p.name, detail: `${p.startDate} → ${p.endDate}` };
  }
  if (message.actionType === 'ADD_STOP') {
    const p = message.actionPayload as AddStopActionPayload;
    return { title: `City #${p.cityId}`, detail: `${p.arrivalDate} → ${p.departureDate}` };
  }
  if (message.actionType === 'ADD_ACTIVITY') {
    const p = message.actionPayload as AddActivityActionPayload;
    return {
      title: p.customName ?? `Activity #${p.activityId}`,
      detail: `${p.scheduledDate}${p.costCents ? ' · ' + formatMoney(p.costCents) : ''}`,
    };
  }
  return { title: 'Suggestion', detail: '' };
}

function ProposalCard({ message, sessionId }: { message: ChatMessage; sessionId: string }) {
  const accept = useAcceptChatAction(sessionId);
  const reject = useRejectChatAction(sessionId);
  const { title, detail } = proposalSummary(message);
  const pending = message.actionStatus === 'PENDING';

  return (
    <div className="mt-2 grid gap-2 rounded-xl border border-rail bg-wash-soft p-3">
      <div>
        <p className="m-0 font-heading text-[0.7rem] font-bold uppercase tracking-wide text-accent">
          {message.actionType?.replace('_', ' ')}
        </p>
        <h5 className="m-0 mt-0.5 font-display text-[1rem] font-semibold text-ink">{title}</h5>
        {detail && <p className="m-0 text-[0.8rem] text-muted">{detail}</p>}
      </div>
      {pending ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => accept.mutate(message.id)}
            disabled={accept.isPending || reject.isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-1.5 font-heading text-[0.78rem] font-semibold text-white disabled:opacity-60"
          >
            <Check size={13} /> {accept.isPending ? 'Adding…' : 'Accept'}
          </button>
          <button
            type="button"
            onClick={() => reject.mutate(message.id)}
            disabled={accept.isPending || reject.isPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-rail bg-paper py-1.5 font-heading text-[0.78rem] font-semibold text-muted disabled:opacity-60"
          >
            <X size={13} /> Reject
          </button>
        </div>
      ) : (
        <p className="m-0 text-[0.76rem] font-semibold text-muted">
          {message.actionStatus === 'ACCEPTED' ? '✓ Added' : 'Dismissed'}
        </p>
      )}
    </div>
  );
}

function ChatPlanner() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = useState<string | undefined>(routeSessionId);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setSessionId(routeSessionId), [routeSessionId]);

  const { data: messages, isLoading } = useChatMessages(sessionId);
  const startSession = useStartChatSession();
  const sendMessage = useSendChatMessage(sessionId);
  const isSending = startSession.isPending || sendMessage.isPending;

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;
    setError('');
    setInput('');
    try {
      if (!sessionId) {
        const result = await startSession.mutateAsync(text);
        queryClient.setQueryData(['chatMessages', result.session.id], result.messages);
        setSessionId(result.session.id);
        navigate(`/chat/${result.session.id}`, { replace: true });
      } else {
        await sendMessage.mutateAsync(text);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the assistant.');
      setInput(text);
    }
  }

  return (
    <section className="mx-auto flex h-[calc(100svh-4.5rem)] max-w-[46rem] flex-col px-[clamp(1rem,4vw,3rem)] py-[clamp(1.4rem,4vw,2.2rem)]">
      <p className="m-0 font-heading text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">
        Home / Plan with AI
      </p>
      <h1 className="m-0 mt-1 font-display text-[clamp(1.6rem,4vw,2.1rem)] font-semibold tracking-tight text-ink">
        Let's plan your trip.
      </h1>

      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-rail bg-paper p-4">
        {!sessionId && !messages?.length && (
          <p className="text-[0.9rem] text-muted">
            Tell me where you'd like to go — e.g. "Plan me a 5 day trip to Goa and Mumbai, budget
            friendly." I'll ground every idea in our own city and activity catalogue, and you
            decide what actually gets added — nothing is written until you accept it.
          </p>
        )}
        {isLoading && <p className="text-[0.86rem] text-muted">Loading conversation…</p>}
        <div className="grid gap-3">
          {(messages ?? []).map((m) =>
            m.role === 'TOOL' ? (
              <p key={m.id} className="m-0 text-center text-[0.76rem] text-placeholder">
                {m.content}
              </p>
            ) : (
              <div key={m.id} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.88rem] leading-relaxed ${
                    m.role === 'USER' ? 'bg-brand text-white' : 'bg-wash-deep text-ink'
                  }`}
                >
                  {m.content}
                  {m.actionType && sessionId && <ProposalCard message={m} sessionId={sessionId} />}
                </div>
              </div>
            ),
          )}
          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-wash-deep px-3.5 py-2.5 text-[0.86rem] text-muted">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="m-0 mt-2 text-[0.8rem] text-stamp">{error}</p>}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Plan me a 3 day trip to…"
          className="min-h-[2.6rem] flex-1 rounded-full border border-rail px-4 text-[0.9rem]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="grid h-[2.6rem] w-[2.6rem] place-items-center rounded-full bg-brand text-white disabled:opacity-60"
        >
          <Send size={16} />
        </button>
      </div>
    </section>
  );
}

export default ChatPlanner;
