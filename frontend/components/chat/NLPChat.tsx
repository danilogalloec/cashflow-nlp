'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Send, Mic, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { NLPParseOut, TransactionOut } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type UserMessage  = { id: string; type: 'user'; text: string };
type ParseMessage = { id: string; type: 'parse'; result: NLPParseOut; confirmed?: boolean };
type SuccessMsg   = { id: string; type: 'success'; tx: TransactionOut };
type ErrorMsg     = { id: string; type: 'error'; text: string };
type ChatMessage  = UserMessage | ParseMessage | SuccessMsg | ErrorMsg;

// ── Helpers ───────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => String(++_id);

const DIR_CONFIG = {
  income:   { label: 'INGRESO',       cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  expense:  { label: 'GASTO',         cls: 'text-red-400    bg-red-500/10    border-red-500/25'    },
  transfer: { label: 'TRANSFERENCIA', cls: 'text-amber-400  bg-amber-500/10  border-amber-500/25'  },
} as const;

const PLACEHOLDERS = [
  'Gasté 85 en almuerzo hoy…',
  'Recibí mi sueldo de Q5,000…',
  'Transferí 200 de banco a efectivo…',
  'Pagué 45.50 en transporte…',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'from-accent to-primary-light' : pct >= 50 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Confianza</span>
        <span className={clsx('font-semibold', pct >= 70 ? 'text-accent-light' : pct >= 50 ? 'text-amber-400' : 'text-red-400')}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div
          className={clsx('h-full bg-gradient-to-r rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ParseCard({
  msg,
  onConfirm,
  onDismiss,
}: {
  msg: ParseMessage;
  onConfirm: (msg: ParseMessage) => void;
  onDismiss: (id: string) => void;
}) {
  const { result, confirmed } = msg;
  const dir = result.direction ? DIR_CONFIG[result.direction] : null;
  const pct = Math.round(result.confidence * 100);
  const canAutoConfirm = pct >= 70 && !!result.amount && !!result.direction;

  return (
    <div
      className={clsx(
        'rounded-2xl rounded-bl-sm border p-4 text-sm transition-all',
        confirmed ? 'opacity-50 pointer-events-none' : 'bg-bg-elevated border-bg-border',
      )}
    >
      {/* Direction badge */}
      {dir ? (
        <span className={clsx('inline-flex px-2 py-0.5 rounded border text-xs font-bold mb-3', dir.cls)}>
          {dir.label}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold mb-3 text-slate-400 bg-slate-500/10 border-slate-500/20">
          <Info size={10} /> Sin clasificar
        </span>
      )}

      {/* Amount */}
      {result.amount ? (
        <div className="text-2xl font-extrabold text-white mb-1">
          {result.amount} {result.currency}
        </div>
      ) : (
        <div className="text-slate-500 text-sm mb-1 italic">Monto no detectado</div>
      )}

      {/* Metadata chips */}
      <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
        {result.category_hint && (
          <span className="px-2 py-0.5 rounded-md bg-primary-muted text-primary-light border border-primary/20">
            📁 {result.category_hint}
          </span>
        )}
        {result.account_type_hint && (
          <span className="px-2 py-0.5 rounded-md bg-bg-border text-slate-300">
            🏦 {result.account_type_hint}
          </span>
        )}
        {result.to_account_type_hint && (
          <span className="px-2 py-0.5 rounded-md bg-bg-border text-slate-300">
            → 🏦 {result.to_account_type_hint}
          </span>
        )}
        {result.transaction_date && (
          <span className="px-2 py-0.5 rounded-md bg-bg-border text-slate-400">
            📅 {result.transaction_date}
          </span>
        )}
      </div>

      <ConfidenceBar value={result.confidence} />

      {/* Actions */}
      {!confirmed && (
        <div className="flex gap-2 mt-3">
          {canAutoConfirm ? (
            <button
              onClick={() => onConfirm(msg)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover px-3 py-2 rounded-lg transition-colors"
            >
              <CheckCircle size={13} />
              Registrar ahora
            </button>
          ) : (
            <span className="flex-1 text-xs text-slate-500 py-2 px-3 bg-bg-border/50 rounded-lg text-center">
              Confianza baja — edita y reenvía
            </span>
          )}
          <button
            onClick={() => onDismiss(msg.id)}
            className="p-2 rounded-lg border border-bg-border text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {confirmed && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-3">
          <CheckCircle size={12} />
          Registrado
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NLPChatProps {
  onTransactionCreated?: () => void;
}

export default function NLPChat({ onTransactionCreated }: NLPChatProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cycle placeholder
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length;
      setPlaceholder(PLACEHOLDERS[i]);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !token) return;

    setInput('');
    setMessages(prev => [...prev, { id: uid(), type: 'user', text }]);
    setIsLoading(true);

    try {
      const result = await api.transactions.parse(token, text, false);
      setMessages(prev => [...prev, { id: uid(), type: 'parse', result }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      setMessages(prev => [...prev, { id: uid(), type: 'error', text: msg }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, token]);

  const handleConfirm = useCallback(async (parseMsg: ParseMessage) => {
    if (!token) return;
    setIsLoading(true);

    try {
      const result = await api.transactions.parse(token, parseMsg.result.raw_text, true);
      // Mark parse message as confirmed
      setMessages(prev => prev.map(m =>
        m.id === parseMsg.id ? ({ ...m, confirmed: true } as ParseMessage) : m,
      ));
      if (result.transaction) {
        setMessages(prev => [...prev, { id: uid(), type: 'success', tx: result.transaction! }]);
        onTransactionCreated?.();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar';
      setMessages(prev => [...prev, { id: uid(), type: 'error', text: msg }]);
    } finally {
      setIsLoading(false);
    }
  }, [token, onTransactionCreated]);

  const handleDismiss = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl flex flex-col h-full min-h-[500px] max-h-[680px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-bg-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
          <span className="text-primary-light text-xs font-bold">AI</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Asistente de Gastos</p>
          <p className="text-xs text-slate-500">NLP en español · Escribe o dicta</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-slate-500">En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-sm font-medium text-slate-300 mb-2">¿Qué movimiento registramos hoy?</p>
            <p className="text-xs text-slate-500">
              Escribe algo como &quot;Gasté 50 en comida&quot; o &quot;Recibí mi sueldo&quot;
            </p>
          </div>
        )}

        {messages.map(msg => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-primary/15 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm text-slate-200">{msg.text}</p>
                </div>
              </div>
            );
          }

          if (msg.type === 'parse') {
            return (
              <div key={msg.id} className="flex justify-start max-w-[90%]">
                <ParseCard msg={msg} onConfirm={handleConfirm} onDismiss={handleDismiss} />
              </div>
            );
          }

          if (msg.type === 'success') {
            return (
              <div key={msg.id} className="flex justify-start animate-slide-up">
                <div className="flex items-start gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-bl-sm max-w-[85%]">
                  <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-400">Transacción registrada</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {msg.tx.description ?? msg.tx.direction} · {msg.tx.amount} {msg.tx.currency}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          if (msg.type === 'error') {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl rounded-bl-sm max-w-[85%]">
                  <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{msg.text}</p>
                </div>
              </div>
            );
          }

          return null;
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-3 bg-bg-elevated border border-bg-border rounded-2xl">
              <Loader2 size={14} className="text-primary-light animate-spin" />
              <span className="text-xs text-slate-400">Analizando…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 border-t border-bg-border">
        <div className="flex items-end gap-2 bg-bg-elevated border border-bg-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
          <button className="p-1.5 text-slate-500 hover:text-primary-light transition-colors" title="Entrada de voz (próximamente)">
            <Mic size={16} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none py-1 max-h-28"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-lg text-white bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  );
}
