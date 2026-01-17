import { useState, useEffect, useCallback } from 'react';

// SHA-1 hash function using Web Crypto API
async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Check if password is in the Have I Been Pwned database using k-anonymity
async function checkPwnedPassword(password: string): Promise<boolean> {
  try {
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    // Use the k-anonymity API - only sends the first 5 chars of the hash
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true' // Adds padding to prevent timing attacks
      }
    });
    
    if (!response.ok) {
      // If API fails, don't block the user - return false (not pwned)
      console.warn('HIBP API error:', response.status);
      return false;
    }
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    // Check if our hash suffix is in the list
    for (const line of hashes) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return true; // Password is pwned
      }
    }
    
    return false; // Password not found in breach database
  } catch (error) {
    console.warn('Error checking pwned password:', error);
    return false; // On error, don't block the user
  }
}

export function usePasswordCheck(password: string, debounceMs = 500) {
  const [isChecking, setIsChecking] = useState(false);
  const [isPwned, setIsPwned] = useState<boolean | null>(null);
  
  const checkPassword = useCallback(async (pwd: string) => {
    // Only check if password meets minimum requirements
    if (pwd.length < 6) {
      setIsPwned(null);
      return;
    }
    
    setIsChecking(true);
    try {
      const result = await checkPwnedPassword(pwd);
      setIsPwned(result);
    } finally {
      setIsChecking(false);
    }
  }, []);
  
  useEffect(() => {
    if (password.length < 6) {
      setIsPwned(null);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      checkPassword(password);
    }, debounceMs);
    
    return () => clearTimeout(timeoutId);
  }, [password, debounceMs, checkPassword]);
  
  return {
    isChecking,
    isPwned,
    // Helper to determine if password is valid
    isValid: password.length >= 6 && isPwned === false
  };
}