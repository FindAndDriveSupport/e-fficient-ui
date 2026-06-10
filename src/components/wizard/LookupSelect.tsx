import { useState, useEffect } from "react";

const WORKER = import.meta.env.VITE_WORKER_URL as string | undefined;

interface Props {
  value: string;
  onChange: (v: string) => void;
  endpoint: string;
  placeholder?: string;
}

export function LookupSelect({ value, onChange, endpoint, placeholder = "Search..." }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const listId = endpoint.replace(/\//g, "-");

  useEffect(() => {
    if (!WORKER || value.length < 1) return;
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`${WORKER}${endpoint}?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setOptions((data.results || []).map((r: { name: string }) => r.name));
      } catch { setOptions([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [value, endpoint]);

  return (
    <div className="relative">
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}