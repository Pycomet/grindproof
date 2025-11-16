import React from 'react';

/**
 * Convert markdown text to React elements
 * Handles: **bold**, *italic*, `code`, line breaks, and lists
 */
export function markdownToReact(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Split by code blocks first (backticks) - allow empty code blocks
  const codeBlockRegex = /`([^`]*)`/g;
  const codeMatches: Array<{ start: number; end: number; content: string }> = [];
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    codeMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  // Process text with code blocks
  let lastIndex = 0;
  const processedParts: Array<{ type: 'text' | 'code'; content: string }> = [];

  if (codeMatches.length === 0) {
    // No code blocks, process entire text
    processedParts.push({
      type: 'text',
      content: text,
    });
  } else {
    codeMatches.forEach((codeMatch) => {
      if (codeMatch.start > lastIndex) {
        processedParts.push({
          type: 'text',
          content: text.substring(lastIndex, codeMatch.start),
        });
      }
      processedParts.push({
        type: 'code',
        content: codeMatch.content,
      });
      lastIndex = codeMatch.end;
    });

    if (lastIndex < text.length) {
      processedParts.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }
  }

  // Process each part
  processedParts.forEach((part) => {
    if (part.type === 'code') {
      parts.push(
        <code
          key={key++}
          className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-700"
        >
          {part.content}
        </code>
      );
    } else {
      // Process bold, italic, and line breaks in text
      let textIndex = 0;
      const textContent = part.content;

      // Regex for bold (**text**)
      const boldRegex = /\*\*([^*]+)\*\*/g;
      const boldMatches: Array<{ start: number; end: number; content: string }> = [];
      while ((match = boldRegex.exec(textContent)) !== null) {
        boldMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
        });
      }

      // Regex for italic (*text* but not **text**)
      // First, mark bold regions to exclude from italic matching
      const boldRegions: Array<{ start: number; end: number }> = boldMatches.map((m) => ({
        start: m.start,
        end: m.end,
      }));

      // Find italic matches, excluding those in bold regions
      const italicRegex = /\*([^*]+)\*/g;
      const italicMatches: Array<{ start: number; end: number; content: string }> = [];
      while ((match = italicRegex.exec(textContent)) !== null) {
        // Check if it's not part of a bold match
        const isInBold = boldRegions.some(
          (b) => match.index >= b.start && match.index < b.end
        );
        // Also check if it's actually bold (double asterisk before or after)
        const charBefore = match.index > 0 ? textContent[match.index - 1] : '';
        const charAfter = match.index + match[0].length < textContent.length 
          ? textContent[match.index + match[0].length] 
          : '';
        const isBold = charBefore === '*' || charAfter === '*';
        if (!isInBold && !isBold) {
          italicMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            content: match[1],
          });
        }
      }

      // Combine and sort all matches
      const allMatches = [
        ...boldMatches.map((m) => ({ ...m, type: 'bold' as const })),
        ...italicMatches.map((m) => ({ ...m, type: 'italic' as const })),
      ].sort((a, b) => a.start - b.start);

      // Process text with matches
      if (allMatches.length === 0) {
        // No matches, just process line breaks
        parts.push(...processLineBreaks(textContent, key));
      } else {
        let currentIndex = 0;
        allMatches.forEach((matchItem) => {
          // Add text before match
          if (matchItem.start > currentIndex) {
            const beforeText = textContent.substring(currentIndex, matchItem.start);
            if (beforeText) {
              parts.push(...processLineBreaks(beforeText, key));
              key += beforeText.split('\n').length;
            }
          }

          // Add match
          if (matchItem.type === 'bold') {
            parts.push(
              <strong key={key++} className="font-semibold">
                {matchItem.content}
              </strong>
            );
          } else {
            parts.push(
              <em key={key++} className="italic">
                {matchItem.content}
              </em>
            );
          }

          currentIndex = matchItem.end;
        });

        // Add remaining text
        if (currentIndex < textContent.length) {
          const remainingText = textContent.substring(currentIndex);
          if (remainingText) {
            parts.push(...processLineBreaks(remainingText, key));
          }
        }
      }
    }
  });

  return <>{parts}</>;
}

/**
 * Process line breaks in text
 */
function processLineBreaks(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    if (index > 0) {
      parts.push(<br key={startKey + index - 1} />);
    }
    if (line) {
      parts.push(<span key={startKey + index + 1000}>{line}</span>);
    }
  });

  return parts;
}

