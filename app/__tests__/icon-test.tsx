import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import Icon, { type IconName } from '../src/components/Icon';
import { darkColors, lightColors, useTheme } from '../src/lib/theme';

// Exhaustive by construction: the Record type makes a missed or extra glyph a
// compile error, so the render loop below can never silently test a subset.
const ICON_COVERAGE: Record<IconName, true> = {
  home: true,
  mic: true,
  stop: true,
  play: true,
  pause: true,
  eye: true,
  'eye-off': true,
  help: true,
  'chevron-right': true,
  'chevron-down': true,
  'chevron-up': true,
  flame: true,
  trophy: true,
  'trending-up': true,
  clock: true,
  'audio-lines': true,
  user: true,
  sliders: true,
  share: true,
  trash: true,
  check: true,
  close: true,
  refresh: true,
  lock: true,
  sparkle: true,
  book: true,
  calendar: true,
  target: true,
  'arrow-right': true,
  warning: true,
  volume: true,
  globe: true,
  list: true,
  download: true,
};
const ALL_ICONS = Object.keys(ICON_COVERAGE) as IconName[];

describe('Icon', () => {
  it('renders every glyph in the set with default ink and size', async () => {
    for (const name of ALL_ICONS) {
      await render(<Icon name={name} testID={`icon-${name}`} />);
      expect(screen.getByTestId(`icon-${name}`, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it('accepts an explicit size and color', async () => {
    await render(<Icon name="mic" size={32} color="#123456" testID="sized-icon" />);
    const host = screen.getByTestId('sized-icon', { includeHiddenElements: true });
    expect(host).toBeTruthy();
    // Size and ink live on the inner 24-unit glyph, which scales inside the
    // requested square; the host is the contract surface callers style against.
    const svg = host.props.children as { props: { width: number; height: number } };
    expect(svg.props.width).toBe(32);
    expect(svg.props.height).toBe(32);
  });

  it('defaults to themed body ink', async () => {
    let themedInk = '';
    function Probe() {
      const theme = useTheme();
      themedInk = theme.colors.text;
      return <Icon name="check" testID="themed-icon" />;
    }
    await render(<Probe />);
    expect(themedInk).toBe(lightColors.text);
    expect(screen.getByTestId('themed-icon', { includeHiddenElements: true })).toBeTruthy();
  });

  it('is decorative and hidden from assistive tech without a label', async () => {
    await render(<Icon name="flame" testID="decorative-icon" />);
    const host = screen.getByTestId('decorative-icon', { includeHiddenElements: true });
    expect(host.props.accessibilityElementsHidden).toBe(true);
    expect(host.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(host.props.accessibilityRole).toBeUndefined();
    expect(host.props.pointerEvents).toBe('none');
  });

  it('becomes a labelled image when accessibilityLabel is provided', async () => {
    await render(<Icon name="mic" accessibilityLabel="Microphone" testID="labelled-icon" />);
    const host = screen.getByTestId('labelled-icon', { includeHiddenElements: true });
    expect(host.props.accessibilityRole).toBe('image');
    expect(host.props.accessibilityLabel).toBe('Microphone');
    expect(host.props.accessibilityElementsHidden).toBeUndefined();
    expect(screen.getByLabelText('Microphone')).toBe(host);
  });

  it('exposes every dark-mode ink through the theme the same way', () => {
    // The glyph inherits theme ink; dark palettes must keep the same keys so
    // Icon never needs scheme branching.
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('centers its host square and passes the requested stroke width through', async () => {
    await render(<Icon name="check" strokeWidth={3} testID="host-icon" />);
    const host = screen.getByTestId('host-icon', { includeHiddenElements: true });
    expect(StyleSheet.flatten(host.props.style)).toEqual({
      alignItems: 'center',
      justifyContent: 'center',
    });
    const svg = host.props.children as React.ReactElement;
    for (const primitive of primitivesOf(svg)) {
      if (primitive.props.stroke !== undefined) {
        expect(primitive.props.strokeWidth).toBe(3);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Glyph geometry: every icon's primitives are pinned exactly, in draw order.
// A wrong case label, an altered path string, or a dropped common prop
// (stroke/fill) changes one of these signatures.
// ---------------------------------------------------------------------------

type Primitive = React.ReactElement<{ [prop: string]: unknown }>;

function primitivesOf(svg: React.ReactElement): Primitive[] {
  const rendered: unknown = (svg.props as { children?: unknown }).children;
  if (rendered === undefined || rendered === null) return [];
  // A multi-primitive glyph arrives as a fragment; a single primitive (stop,
  // play, chevrons, check, close, flame) arrives bare.
  const children =
    React.isValidElement(rendered) && rendered.type === React.Fragment
      ? (rendered.props as { children?: unknown }).children
      : rendered;
  if (children === undefined || children === null) return [];
  return (Array.isArray(children) ? children : [children]) as Primitive[];
}

/** Draw-order signature of one primitive; mirrors the authored geometry. */
function signature(primitive: Primitive): string {
  const props = primitive.props as Record<string, unknown>;
  switch (primitive.type) {
    case Path:
      return `path:${String(props.d)}`;
    case Rect:
      return `rect:${String(props.x)},${String(props.y)} ${String(props.width)}x${String(props.height)} r${String(props.rx)}`;
    case Circle:
      return `circle:${String(props.cx)},${String(props.cy)} r${String(props.r)}`;
    case Line:
      return `line:${String(props.x1)},${String(props.y1)} ${String(props.x2)},${String(props.y2)}`;
    case Polyline:
      return `poly:${String(props.points)}`;
    default:
      return `other:${String((props as { name?: unknown }).name)}`;
  }
}

const GLYPH_GEOMETRY: Record<IconName, readonly string[]> = {
  home: [
    'path:M3.5 10.5 12 3.5l8.5 7',
    'path:M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5',
    'path:M9.5 21v-6h5v6',
  ],
  mic: [
    'path:M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z',
    'path:M5.5 11v1a6.5 6.5 0 0 0 13 0v-1',
    'path:M12 18.5v3M8.5 21.5h7',
  ],
  stop: ['rect:7,7 10x10 r2'],
  play: ['path:M8.5 5.6v12.8a.6.6 0 0 0 .92.5l10-6.4a.6.6 0 0 0 0-1l-10-6.4a.6.6 0 0 0-.92.5Z'],
  pause: ['rect:7,5.5 3.6x13 r1.2', 'rect:13.4,5.5 3.6x13 r1.2'],
  eye: [
    'path:M2.5 12S5.8 5.5 12 5.5 21.5 12 21.5 12 18.2 18.5 12 18.5 2.5 12 2.5 12Z',
    'circle:12,12 r2.8',
  ],
  'eye-off': [
    'path:M4.5 8.5C3.2 9.9 2.5 12 2.5 12S5.8 18.5 12 18.5c1.6 0 3-.4 4.2-1',
    'path:M9 5.9A9.6 9.6 0 0 1 12 5.5c6.2 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-2.4 3.2',
    'path:M9.9 9.9a2.8 2.8 0 0 0 4 4',
    'path:M4 4l16 16',
  ],
  help: [
    'circle:12,12 r9',
    'path:M9.2 9.2a2.9 2.9 0 1 1 4.3 2.6c-.9.6-1.5 1.1-1.5 2.2',
    'circle:12,16.8 r0.9',
  ],
  'chevron-right': ['path:M9 5.5 15.5 12 9 18.5'],
  'chevron-down': ['path:M5.5 9 12 15.5 18.5 9'],
  'chevron-up': ['path:M5.5 15 12 8.5 18.5 15'],
  flame: [
    'path:M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z',
  ],
  trophy: [
    'path:M7 4h10v5a5 5 0 0 1-10 0V4Z',
    'path:M7 5.5H4.5a1 1 0 0 0-1 1V7c0 1.6 1.3 3.3 3.6 3.9M17 5.5h2.5a1 1 0 0 1 1 1V7c0 1.6-1.3 3.3-3.6 3.9',
    'path:M12 14v4.5M8.5 20.5h7',
  ],
  'trending-up': ['poly:3,17 9.5,10.5 13.5,14.5 21,7', 'poly:14.5,7 21,7 21,13.5'],
  clock: ['circle:12,12 r9', 'poly:12,7 12,12 15.5,14'],
  'audio-lines': [
    'line:4,9 4,15',
    'line:8,5.5 8,18.5',
    'line:12,3 12,21',
    'line:16,6.5 16,17.5',
    'line:20,9.5 20,14.5',
  ],
  user: ['circle:12,8 r3.8', 'path:M4.8 20.5a7.2 7.2 0 0 1 14.4 0'],
  sliders: ['line:4,8 20,8', 'circle:9.5,8 r2.1', 'line:4,16 20,16', 'circle:14.5,16 r2.1'],
  share: [
    'path:M12 3.5V15',
    'path:M7.8 7.7 12 3.5l4.2 4.2',
    'path:M7 10.5H5.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H17',
  ],
  trash: [
    'path:M4.5 6.5h15',
    'path:M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7',
    'path:M6.5 6.5 7.3 19a1.8 1.8 0 0 0 1.8 1.7h5.8A1.8 1.8 0 0 0 16.7 19l.8-12.5',
    'path:M10 10.5v6M14 10.5v6',
  ],
  check: ['path:M4.5 12.5 9.5 17.5 19.5 6.5'],
  close: ['path:M6 6l12 12M18 6 6 18'],
  refresh: [
    'path:M3.5 12a8.5 8.5 0 0 1 14.3-6.2L20.5 8',
    'poly:20.5,3 20.5,8 15.5,8',
    'path:M20.5 12a8.5 8.5 0 0 1-14.3 6.2L3.5 16',
    'poly:3.5,21 3.5,16 8.5,16',
  ],
  lock: ['rect:5,10.5 14x9.5 r2', 'path:M8 10.5V7.5a4 4 0 0 1 8 0v3'],
  sparkle: [
    'path:M11 3.5l1.6 4.3a1 1 0 0 0 .6.6l4.3 1.6-4.3 1.6a1 1 0 0 0-.6.6L11 16.5l-1.6-4.3a1 1 0 0 0-.6-.6L4.5 10l4.3-1.6a1 1 0 0 0 .6-.6Z',
    'path:M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z',
  ],
  book: [
    'path:M2.5 4.5H9A3 3 0 0 1 12 7.5V20a2.5 2.5 0 0 0-2.5-2.5h-7V4.5Z',
    'path:M21.5 4.5H15A3 3 0 0 0 12 7.5V20a2.5 2.5 0 0 1 2.5-2.5h7V4.5Z',
  ],
  calendar: ['rect:3.5,5 17x15.5 r2', 'path:M3.5 9.5h17M8 3v4M16 3v4'],
  target: ['circle:12,12 r9', 'circle:12,12 r5', 'circle:12,12 r1.3'],
  'arrow-right': ['path:M4 12h16', 'poly:13.5,5.5 20,12 13.5,18.5'],
  warning: [
    'path:M12 3.8 21 19.2a1 1 0 0 1-.86 1.5H3.86A1 1 0 0 1 3 19.2Z',
    'path:M12 9.5v4.5',
    'circle:12,17 r0.9',
  ],
  volume: [
    'path:M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z',
    'path:M15.5 9.2a4.2 4.2 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8',
  ],
  globe: [
    'circle:12,12 r9',
    'path:M3 12h18',
    'path:M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18Z',
  ],
  list: [
    'path:M8.5 6h12M8.5 12h12M8.5 18h12',
    'circle:4.5,6 r0.9',
    'circle:4.5,12 r0.9',
    'circle:4.5,18 r0.9',
  ],
  download: [
    'path:M12 3.5V15',
    'path:M7.8 10.8 12 15l4.2-4.2',
    'path:M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2',
  ],
};

describe('Icon glyph geometry', () => {
  it('draws every glyph exactly as authored, in draw order', async () => {
    for (const name of ALL_ICONS) {
      const { getByTestId } = await render(<Icon name={name} testID={`geom-${name}`} />);
      const host = getByTestId(`geom-${name}`, { includeHiddenElements: true });
      const svg = host.props.children as React.ReactElement;
      const primitives = primitivesOf(svg);
      const expected = GLYPH_GEOMETRY[name];
      expect(primitives.map(signature)).toEqual([...expected]);
    }
  });

  it('inks stroked primitives with the theme color and keeps fills explicit', async () => {
    for (const name of ALL_ICONS) {
      const { getByTestId } = await render(
        <Icon name={name} color="#135713" testID={`ink-${name}`} />,
      );
      const host = getByTestId(`ink-${name}`, { includeHiddenElements: true });
      const svg = host.props.children as React.ReactElement;
      for (const primitive of primitivesOf(svg)) {
        const props = primitive.props as Record<string, unknown>;
        // Every authored primitive carries an explicit fill — 'none' on the
        // stroked outlines, the ink on the filled marks — so a dropped fill
        // never silently falls through both branches.
        expect(props.fill).toBeDefined();
        if (props.stroke !== undefined) {
          expect(props.stroke).toBe('#135713');
          expect(props.fill).toBe('none');
        } else {
          // Filled marks (stop/play/pause and the dot accents) carry the ink
          // through fill instead of stroke.
          expect(props.fill).toBe('#135713');
        }
      }
    }
  });
});

describe('Icon stroke and canvas wiring', () => {
  it("pins the slider knob circles' explicit stroke width alongside the rails", async () => {
    await render(<Icon name="sliders" strokeWidth={3.5} color="#246810" testID="sliders-wired" />);
    const host = screen.getByTestId('sliders-wired', { includeHiddenElements: true });
    const svg = host.props.children as React.ReactElement;
    const primitives = primitivesOf(svg);
    const knobs = primitives.filter((primitive) => primitive.type === Circle);
    // The two slider knobs spell their stroke props out individually.
    expect(knobs).toHaveLength(2);
    for (const knob of knobs) {
      expect(knob.props.stroke).toBe('#246810');
      expect(knob.props.strokeWidth).toBe(3.5);
      expect(knob.props.fill).toBe('none');
    }
    // The two rails share the same width through the common spread.
    const rails = primitives.filter((primitive) => primitive.type === Line);
    expect(rails).toHaveLength(2);
    for (const rail of rails) {
      expect(rail.props.strokeWidth).toBe(3.5);
    }
  });

  it('draws on the fixed 24-unit canvas with round stroke caps and joins', async () => {
    await render(<Icon name="check" testID="canvas-icon" />);
    const host = screen.getByTestId('canvas-icon', { includeHiddenElements: true });
    const svg = host.props.children as React.ReactElement<{
      viewBox?: string;
      strokeLinecap?: string;
      strokeLinejoin?: string;
    }>;
    expect(svg.props.viewBox).toBe('0 0 24 24');
    expect(svg.props.strokeLinecap).toBe('round');
    expect(svg.props.strokeLinejoin).toBe('round');
  });
});
