import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2, AtSign } from 'lucide-react';

// Generates a unique handle from a full name + random suffix
export function generateHandle(fullName) {
  const base = (fullName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')   // non-alphanumeric → underscore
    .replace(/_+/g, '_')           // collapse multiple underscores
    .replace(/^_|_$/g, '')         // trim leading/trailing underscores
    .slice(0, 20);
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `${base || 'user'}_${suffix}`;
}

/**
 * HandleEditor — inline handle input with real-time uniqueness checking.
 * Props:
 *   value        — current handle string
 *   onChange     — called with new handle string as user types
 *   myEmail      — current user's email (to exclude self from uniqueness check)
 *   onValidChange — called with (handle, isValid) whenever validity changes
 */
export default function HandleEditor({ value, onChange, myEmail, onValidChange }) {
  const [debouncedHandle, setDebouncedHandle] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHandle(value), 400);
    return () => clearTimeout(t);
  }, [value]);

  // Validate format: 3-30 chars, only letters/numbers/underscores
  const formatValid = /^[a-z0-9_]{3,30}$/.test(debouncedHandle || '');

  const { data: taken, isFetching } = useQuery({
    queryKey: ['handle_check', debouncedHandle],
    queryFn: async () => {
      if (!debouncedHandle || !formatValid) return false;
      const results = await base44.entities.User.filter({ handle: debouncedHandle });
      // Taken if any OTHER user has this handle
      return results.some(u => u.email !== myEmail);
    },
    enabled: !!debouncedHandle && formatValid,
    staleTime: 10_000,
  });

  const isValid = formatValid && !taken && !isFetching;

  useEffect(() => {
    if (onValidChange && debouncedHandle === value) {
      onValidChange(debouncedHandle, isValid);
    }
  }, [debouncedHandle, isValid, value]);

  const handleInput = (e) => {
    // Force lowercase, strip invalid chars immediately
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    onChange(sanitized);
  };

  const showStatus = debouncedHandle && debouncedHandle.length >= 3;

  return (
    <div className="space-y-1">
      <div className="relative">
        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value || ''}
          onChange={handleInput}
          placeholder="your_handle"
          maxLength={30}
          className="pl-8 pr-9"
        />
        {showStatus && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : taken ? (
              <XCircle className="w-4 h-4 text-destructive" />
            ) : formatValid ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : null}
          </span>
        )}
      </div>
      {showStatus && (
        <p className={`text-xs ${taken ? 'text-destructive font-medium' : !formatValid ? 'text-muted-foreground' : 'text-green-600'}`}>
          {taken
            ? '⚠️ This handle is already taken — please choose a different one.'
            : !formatValid
            ? 'Handle must be 3–30 characters: lowercase letters, numbers, underscores only.'
            : '✓ Handle is available!'}
        </p>
      )}
    </div>
  );
}