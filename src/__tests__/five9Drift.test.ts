import { describe, it, expect } from 'vitest';
import { computeFive9Drift } from '@/lib/campaign-os/five9Drift';

describe('computeFive9Drift', () => {
  const os = [
    { five9_variable_name: 'Caller_First_Name', five9_variable_kind: 'call', data_type: 'string' },
    { five9_variable_name: 'Caller_Phone', five9_variable_kind: 'call', data_type: 'string' },
  ];

  it('reports no drift when sets are identical', () => {
    const result = computeFive9Drift(os, [
      { name: 'Caller_First_Name', kind: 'call', type: 'string' },
      { name: 'Caller_Phone', kind: 'call', type: 'string' },
    ]);
    expect(result.total_drift).toBe(0);
    expect(result.missing_in_five9).toEqual([]);
    expect(result.missing_in_os).toEqual([]);
  });

  it('detects missing_in_five9 when OS has a variable Five9 does not', () => {
    const result = computeFive9Drift(os, [{ name: 'Caller_First_Name', kind: 'call', type: 'string' }]);
    expect(result.missing_in_five9).toEqual(['Caller_Phone']);
    expect(result.total_drift).toBe(1);
  });

  it('detects missing_in_os when Five9 has a variable OS does not', () => {
    const result = computeFive9Drift(os, [
      { name: 'Caller_First_Name', kind: 'call', type: 'string' },
      { name: 'Caller_Phone', kind: 'call', type: 'string' },
      { name: 'Extra_Var', kind: 'call', type: 'string' },
    ]);
    expect(result.missing_in_os).toEqual(['Extra_Var']);
  });

  it('detects type mismatches', () => {
    const result = computeFive9Drift(os, [
      { name: 'Caller_First_Name', kind: 'call', type: 'number' },
      { name: 'Caller_Phone', kind: 'call', type: 'string' },
    ]);
    expect(result.type_mismatches).toHaveLength(1);
    expect(result.type_mismatches[0].name).toBe('Caller_First_Name');
  });

  it('detects kind mismatches', () => {
    const result = computeFive9Drift(os, [
      { name: 'Caller_First_Name', kind: 'agent', type: 'string' },
      { name: 'Caller_Phone', kind: 'call', type: 'string' },
    ]);
    expect(result.kind_mismatches).toHaveLength(1);
    expect(result.kind_mismatches[0].name).toBe('Caller_First_Name');
  });

  it('handles empty tenant snapshot', () => {
    const result = computeFive9Drift(os, []);
    expect(result.missing_in_five9).toHaveLength(2);
    expect(result.missing_in_os).toHaveLength(0);
  });
});
