import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple diff algorithm to generate unified diff format
function generateUnifiedDiff(original: string, modified: string, filename: string): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  const diff: string[] = [];
  diff.push(`--- a/${filename}`);
  diff.push(`+++ b/${filename}`);
  
  // Simple line-by-line comparison
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  let hunkStart = -1;
  let hunkLines: string[] = [];
  let origLineNum = 1;
  let modLineNum = 1;
  
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];
    
    if (origLine === modLine) {
      // Lines match
      if (hunkLines.length > 0) {
        // Add context line to current hunk
        hunkLines.push(` ${origLine || ''}`);
        origLineNum++;
        modLineNum++;
      } else {
        origLineNum++;
        modLineNum++;
      }
    } else {
      // Lines differ - start or continue a hunk
      if (hunkStart === -1) {
        hunkStart = origLineNum;
        // Add some context before
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (originalLines[j] !== undefined) {
            hunkLines.push(` ${originalLines[j]}`);
          }
        }
      }
      
      if (origLine !== undefined) {
        hunkLines.push(`-${origLine}`);
        origLineNum++;
      }
      if (modLine !== undefined) {
        hunkLines.push(`+${modLine}`);
        modLineNum++;
      }
    }
    
    // Flush hunk if we've had 3+ unchanged lines or at end
    if (hunkLines.length > 0 && (
      (origLine === modLine && hunkLines.filter(l => l.startsWith(' ')).length >= 6) ||
      i === maxLines - 1
    )) {
      const origCount = hunkLines.filter(l => l.startsWith('-') || l.startsWith(' ')).length;
      const modCount = hunkLines.filter(l => l.startsWith('+') || l.startsWith(' ')).length;
      diff.push(`@@ -${hunkStart},${origCount} +${hunkStart},${modCount} @@`);
      diff.push(...hunkLines);
      hunkLines = [];
      hunkStart = -1;
    }
  }
  
  return diff.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { original, modified, filename } = await req.json();
    
    if (original === undefined || modified === undefined) {
      throw new Error('Both original and modified content are required');
    }

    console.log(`Generating diff for ${filename}`);

    const diff = generateUnifiedDiff(
      original || '',
      modified || '',
      filename || 'file'
    );

    // Calculate stats
    const lines = diff.split('\n');
    const additions = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
    const deletions = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        diff,
        stats: {
          additions,
          deletions,
          changes: additions + deletions
        },
        filename
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generate diff error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
