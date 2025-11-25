import { describe, it, expect } from 'vitest';
import { GRINDPROOF_SYSTEM_PROMPT } from '@/lib/prompts/system-prompt';

describe('System Prompt', () => {
  it('should include core GrindProof identity', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('GrindProof');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('accountability coach');
  });

  it('should emphasize data-driven and evidence-based approach', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('data-driven');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('evidence');
  });

  it('should include behavior detection rules', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('avoidance');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('new-project addiction');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('overcommitment');
  });

  it('should emphasize honesty and firmness', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('honest');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('firm');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('never cruel');
  });

  it('should include conciseness instruction', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('BE CONCISE');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('short and direct');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('2-4 sentences max');
  });

  it('should include factual instruction', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('BE FACTUAL');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('State facts');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('not speculation');
  });

  it('should require evidence for completion', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('evidence tasks');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('verifiable proof');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('screenshot');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('GitHub commit');
  });

  it('should include goal creation blocking rule', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('5+ active goals');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('50% complete');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('block the creation');
  });

  it('should emphasize supportiveness', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('supportive');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('help them build momentum');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('coach you\'d want in your corner');
  });

  it('should prohibit inventing data', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('Do not invent evidence');
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('Do not invent');
  });

  it('should include minimal emoji guidance', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('Minimal emoji');
  });

  it('should be a non-empty string', () => {
    expect(typeof GRINDPROOF_SYSTEM_PROMPT).toBe('string');
    expect(GRINDPROOF_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it('should include line break formatting guidance', () => {
    expect(GRINDPROOF_SYSTEM_PROMPT).toContain('line breaks');
  });
});

