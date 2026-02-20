import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY_OUTPUT = "mididash-output-id";

export interface MIDIOutputInfo {
  id: string;
  name: string;
}

export interface UseMIDIReturn {
  outputs: MIDIOutputInfo[];
  selectedOutputId: string | null;
  selectOutput: (id: string) => void;
  sendCC: (channel: number, cc: number, value: number) => void;
  isSupported: boolean;
  isConnected: boolean;
  error: string | null;
}

export function useMIDI(): UseMIDIReturn {
  const [outputs, setOutputs] = useState<MIDIOutputInfo[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY_OUTPUT),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const isSupported = typeof navigator.requestMIDIAccess === "function";

  const refreshOutputs = useCallback(() => {
    const access = midiAccessRef.current;
    if (!access) return;

    const list: MIDIOutputInfo[] = [];
    access.outputs.forEach((output) => {
      list.push({ id: output.id, name: output.name ?? `Output ${output.id}` });
    });
    setOutputs(list);

    // If selected output no longer exists, clear selection
    if (selectedOutputId && !list.some((o) => o.id === selectedOutputId)) {
      setSelectedOutputId(null);
      setIsConnected(false);
      localStorage.removeItem(STORAGE_KEY_OUTPUT);
    }
  }, [selectedOutputId]);

  useEffect(() => {
    if (!isSupported) {
      setError(
        "Web MIDI API is not supported in this browser. Use Chrome or Edge.",
      );
      return;
    }

    let cancelled = false;

    navigator.requestMIDIAccess().then(
      (access) => {
        if (cancelled) return;
        midiAccessRef.current = access;
        refreshOutputs();

        access.onstatechange = () => {
          refreshOutputs();
        };
      },
      (err) => {
        if (cancelled) return;
        setError(`MIDI access denied: ${err.message}`);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [isSupported, refreshOutputs]);

  // Track connection state based on selected output
  useEffect(() => {
    if (!midiAccessRef.current || !selectedOutputId) {
      setIsConnected(false);
      return;
    }
    const output = midiAccessRef.current.outputs.get(selectedOutputId);
    setIsConnected(output?.state === "connected");
  }, [selectedOutputId, outputs]);

  const selectOutput = useCallback((id: string) => {
    setSelectedOutputId(id);
    localStorage.setItem(STORAGE_KEY_OUTPUT, id);
  }, []);

  const sendCC = useCallback(
    (channel: number, cc: number, value: number) => {
      if (!midiAccessRef.current || !selectedOutputId) return;
      const output = midiAccessRef.current.outputs.get(selectedOutputId);
      if (!output) return;

      // MIDI CC message: 0xB0 + channel (0-15), cc number (0-127), value (0-127)
      const status = 0xb0 + (channel & 0x0f);
      const ccClamped = Math.max(0, Math.min(127, Math.round(cc)));
      const valClamped = Math.max(0, Math.min(127, Math.round(value)));
      output.send([status, ccClamped, valClamped]);
    },
    [selectedOutputId],
  );

  return {
    outputs,
    selectedOutputId,
    selectOutput,
    sendCC,
    isSupported,
    isConnected,
    error,
  };
}
