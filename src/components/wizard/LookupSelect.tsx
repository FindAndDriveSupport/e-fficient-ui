import { useState, useEffect, useRef } from "react";

const WORKER = import.meta.env.VITE_WORKER_URL as string | undefined;

interface Props {
  value: string;
  onChange: (v: string) => void;
  endpoint: string;
  placeholder?: string;
}

export function LookupSelect({ value, onChange, endpoint, placeholder = "Search..." }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ id: number; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!WORKER || query.length < 1) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${WORKER}${endpoint}?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const r = data.results || [];
        setResults(r);
        setOpen(r.length > 0);
      } catch { setResults([]); setOpen(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, endpoint]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative" style={{ zIndex: open ? 50 : "auto" }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (!e.target.value) onChange(""); }}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r.id}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
              onMouseDown={(e) => { e.preventDefault(); select(r.name); }}
            >
              {r.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
