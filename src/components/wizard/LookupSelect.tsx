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
    if (!WORKER || query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${WORKER}${endpoint}?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      } catch { setResults([]); }
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
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (!e.target.value) onChange(""); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && results.length > 0 && (
        <div className="fixed z-[9999] mt-1 rounded-md border border-border bg-card shadow-md max-h-48 overflow-y-auto"
          style={{ width: ref.current?.offsetWidth, top: (ref.current?.getBoundingClientRect().bottom ?? 0) + window.scrollY, left: ref.current?.getBoundingClientRect().left }}
        >
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
