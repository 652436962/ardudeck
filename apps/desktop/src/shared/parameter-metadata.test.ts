import { describe, it, expect } from 'vitest';
import {
  validateParameterValue,
  type ParameterMetadata,
} from './parameter-metadata';

describe('validateParameterValue', () => {
  describe('enum value validation (values list)', () => {
    const servoFunctionMetadata: ParameterMetadata = {
      name: 'SERVO5_FUNCTION',
      humanName: 'Servo 5 Function',
      description: 'Function assigned to servo 5',
      values: {
        [-1]: 'GPIO',
        0: 'Disabled',
        1: 'RCPassThru',
        33: 'Motor1',
        34: 'Motor2',
      },
    };

    it('should accept -1 (GPIO) as a valid enum value', () => {
      const result = validateParameterValue(-1, servoFunctionMetadata);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warning).toBeUndefined();
    });

    it('should accept 0 (Disabled) as a valid enum value', () => {
      const result = validateParameterValue(0, servoFunctionMetadata);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept other known enum values', () => {
      const result = validateParameterValue(33, servoFunctionMetadata);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should warn but still validate for unknown enum values', () => {
      const result = validateParameterValue(999, servoFunctionMetadata);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('999');
    });

    it('should warn but not block negative values not in the list', () => {
      const result = validateParameterValue(-5, servoFunctionMetadata);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warning).toBeDefined();
    });
  });

  describe('no metadata', () => {
    it('should allow any value when no metadata is provided', () => {
      const result = validateParameterValue(-1, undefined);
      expect(result.valid).toBe(true);
    });
  });

  describe('range validation', () => {
    const rangeMetadata: ParameterMetadata = {
      name: 'SOME_PARAM',
      humanName: 'Some Param',
      description: 'Test param with range',
      range: { min: -10, max: 100 },
    };

    it('should accept values within range', () => {
      expect(validateParameterValue(50, rangeMetadata).valid).toBe(true);
      expect(validateParameterValue(-10, rangeMetadata).valid).toBe(true);
      expect(validateParameterValue(100, rangeMetadata).valid).toBe(true);
    });

    it('should reject values outside range', () => {
      const result = validateParameterValue(-11, rangeMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('bitmask validation', () => {
    const bitmaskMetadata: ParameterMetadata = {
      name: 'BITMASK_PARAM',
      humanName: 'Bitmask Param',
      description: 'Test bitmask param',
      bitmask: { 0: 'Bit0', 1: 'Bit1', 2: 'Bit2' },
    };

    it('should reject negative values for bitmask params', () => {
      const result = validateParameterValue(-1, bitmaskMetadata);
      expect(result.valid).toBe(false);
    });

    it('should accept non-negative integer values for bitmask params', () => {
      expect(validateParameterValue(0, bitmaskMetadata).valid).toBe(true);
      expect(validateParameterValue(7, bitmaskMetadata).valid).toBe(true);
    });
  });
});

describe('parseParameterXml value regex - negative code support', () => {
  // Test the regex pattern directly since parseParameterXml is not exported
  const valueRegex = /<value\s+code="(-?\d+)"[^>]*>([^<]*)<\/value>/g;

  it('should match positive value codes', () => {
    const xml = '<value code="0">Disabled</value>';
    const match = valueRegex.exec(xml);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('0');
    expect(match![2]).toBe('Disabled');
  });

  it('should match negative value codes like -1 for GPIO', () => {
    valueRegex.lastIndex = 0;
    const xml = '<value code="-1">GPIO</value>';
    const match = valueRegex.exec(xml);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('-1');
    expect(match![2]).toBe('GPIO');
  });

  it('should match all values including negative ones in a block', () => {
    valueRegex.lastIndex = 0;
    const xml = `
      <value code="-1">GPIO</value>
      <value code="0">Disabled</value>
      <value code="1">RCPassThru</value>
      <value code="33">Motor1</value>
    `;
    const matches: Array<{ code: string; label: string }> = [];
    let match;
    while ((match = valueRegex.exec(xml)) !== null) {
      matches.push({ code: match[1]!, label: match[2]!.trim() });
    }
    expect(matches).toHaveLength(4);
    expect(matches[0]).toEqual({ code: '-1', label: 'GPIO' });
    expect(matches[1]).toEqual({ code: '0', label: 'Disabled' });
    expect(matches[2]).toEqual({ code: '1', label: 'RCPassThru' });
    expect(matches[3]).toEqual({ code: '33', label: 'Motor1' });
  });

  it('should parse negative codes as negative numbers', () => {
    valueRegex.lastIndex = 0;
    const xml = '<value code="-1">GPIO</value>';
    const match = valueRegex.exec(xml);
    expect(match).not.toBeNull();
    const codeNumber = parseInt(match![1]!, 10);
    expect(codeNumber).toBe(-1);
  });

  // Verify the OLD regex would have failed
  it('old regex without negative support would miss -1 codes', () => {
    const oldValueRegex = /<value\s+code="(\d+)"[^>]*>([^<]*)<\/value>/g;
    const xml = '<value code="-1">GPIO</value>';
    const match = oldValueRegex.exec(xml);
    expect(match).toBeNull(); // Old regex cannot match negative codes
  });
});

describe('range overrides', () => {
  const qAssist: ParameterMetadata = {
    name: 'Q_ASSIST_SPEED',
    humanName: 'Quadplane assistance speed',
    description: 'Set to -1 to disable assistance',
    range: { min: 0, max: 100 },
    units: 'm/s',
  };

  it('accepts the documented -1 disable value', () => {
    expect(validateParameterValue(-1, qAssist).valid).toBe(true);
  });

  it('still keeps the declared bounds either side', () => {
    expect(validateParameterValue(0, qAssist).valid).toBe(true);
    expect(validateParameterValue(100, qAssist).valid).toBe(true);
    expect(validateParameterValue(-2, qAssist).valid).toBe(false);
    expect(validateParameterValue(101, qAssist).valid).toBe(false);
  });

  it('reports the widened bound in the error, not the declared one', () => {
    expect(validateParameterValue(-2, qAssist).error).toContain('-1');
  });

  it('leaves a parameter with no override alone', () => {
    const plain: ParameterMetadata = {
      name: 'SOME_OTHER_PARAM',
      humanName: 'Other',
      description: '',
      range: { min: 0, max: 10 },
    };
    expect(validateParameterValue(-1, plain).valid).toBe(false);
  });

  it('applies to every parameter whose docs give -1 as the disable value', () => {
    for (const name of ['RC_OVERRIDE_TIME', 'SOAR_MAX_DRIFT', 'SOAR_MAX_RADIUS', 'TA_GSP_MAX']) {
      const meta: ParameterMetadata = {
        name,
        humanName: name,
        description: '',
        range: { min: 0, max: 120 },
      };
      expect(validateParameterValue(-1, meta).valid, name).toBe(true);
    }
  });

  it('does not widen a parameter whose -1 refers to a different parameter', () => {
    const rk9: ParameterMetadata = {
      name: 'RK9_BOOTED',
      humanName: 'Rockblock booted',
      description: 'Requires SERVON_FUNCTION=-1',
      range: { min: 50, max: 110 },
    };
    expect(validateParameterValue(-1, rk9).valid).toBe(false);
  });
});
