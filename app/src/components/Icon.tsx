import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { useTheme } from '../lib/theme';

/**
 * The app icon set: 24×24 outline glyphs drawn with SVG primitives so every
 * mark scales, tints with the theme, and renders identically on both
 * platforms. Icons are decorative by default (screen readers get the adjacent
 * text); pass `accessibilityLabel` when an icon is the entire control.
 *
 * Geometry is authored from primitives (circles/lines/simple paths) so each
 * glyph stays verifiable by eye in code review — no opaque bezier blobs.
 */
export type IconName =
  | 'home'
  | 'mic'
  | 'stop'
  | 'play'
  | 'pause'
  | 'eye'
  | 'eye-off'
  | 'help'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'flame'
  | 'trophy'
  | 'trending-up'
  | 'clock'
  | 'audio-lines'
  | 'user'
  | 'sliders'
  | 'share'
  | 'trash'
  | 'check'
  | 'close'
  | 'refresh'
  | 'lock'
  | 'sparkle'
  | 'book'
  | 'calendar'
  | 'target'
  | 'arrow-right'
  | 'warning'
  | 'volume'
  | 'globe'
  | 'list'
  | 'download';

interface GlyphProps {
  color: string;
  strokeWidth: number;
}

function glyph(name: IconName, { color, strokeWidth }: GlyphProps): React.ReactElement {
  const common = { stroke: color, strokeWidth, fill: 'none' as const };
  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M3.5 10.5 12 3.5l8.5 7" {...common} />
          <Path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" {...common} />
          <Path d="M9.5 21v-6h5v6" {...common} />
        </>
      );
    case 'mic':
      return (
        <>
          <Path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" {...common} />
          <Path d="M5.5 11v1a6.5 6.5 0 0 0 13 0v-1" {...common} />
          <Path d="M12 18.5v3M8.5 21.5h7" {...common} />
        </>
      );
    case 'stop':
      return <Rect x={7} y={7} width={10} height={10} rx={2} fill={color} />;
    case 'play':
      return (
        <Path
          d="M8.5 5.6v12.8a.6.6 0 0 0 .92.5l10-6.4a.6.6 0 0 0 0-1l-10-6.4a.6.6 0 0 0-.92.5Z"
          fill={color}
        />
      );
    case 'pause':
      return (
        <>
          <Rect x={7} y={5.5} width={3.6} height={13} rx={1.2} fill={color} />
          <Rect x={13.4} y={5.5} width={3.6} height={13} rx={1.2} fill={color} />
        </>
      );
    case 'eye':
      return (
        <>
          <Path
            d="M2.5 12S5.8 5.5 12 5.5 21.5 12 21.5 12 18.2 18.5 12 18.5 2.5 12 2.5 12Z"
            {...common}
          />
          <Circle cx={12} cy={12} r={2.8} {...common} />
        </>
      );
    case 'eye-off':
      return (
        <>
          <Path d="M4.5 8.5C3.2 9.9 2.5 12 2.5 12S5.8 18.5 12 18.5c1.6 0 3-.4 4.2-1" {...common} />
          <Path
            d="M9 5.9A9.6 9.6 0 0 1 12 5.5c6.2 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-2.4 3.2"
            {...common}
          />
          <Path d="M9.9 9.9a2.8 2.8 0 0 0 4 4" {...common} />
          <Path d="M4 4l16 16" {...common} />
        </>
      );
    case 'help':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M9.2 9.2a2.9 2.9 0 1 1 4.3 2.6c-.9.6-1.5 1.1-1.5 2.2" {...common} />
          <Circle cx={12} cy={16.8} r={0.9} fill={color} />
        </>
      );
    case 'chevron-right':
      return <Path d="M9 5.5 15.5 12 9 18.5" {...common} />;
    case 'chevron-down':
      return <Path d="M5.5 9 12 15.5 18.5 9" {...common} />;
    case 'chevron-up':
      return <Path d="M5.5 15 12 8.5 18.5 15" {...common} />;
    case 'flame':
      return (
        <Path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
          {...common}
        />
      );
    case 'trophy':
      return (
        <>
          <Path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" {...common} />
          <Path
            d="M7 5.5H4.5a1 1 0 0 0-1 1V7c0 1.6 1.3 3.3 3.6 3.9M17 5.5h2.5a1 1 0 0 1 1 1V7c0 1.6-1.3 3.3-3.6 3.9"
            {...common}
          />
          <Path d="M12 14v4.5M8.5 20.5h7" {...common} />
        </>
      );
    case 'trending-up':
      return (
        <>
          <Polyline points="3,17 9.5,10.5 13.5,14.5 21,7" {...common} />
          <Polyline points="14.5,7 21,7 21,13.5" {...common} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Polyline points="12,7 12,12 15.5,14" {...common} />
        </>
      );
    case 'audio-lines':
      return (
        <>
          <Line x1={4} y1={9} x2={4} y2={15} {...common} />
          <Line x1={8} y1={5.5} x2={8} y2={18.5} {...common} />
          <Line x1={12} y1={3} x2={12} y2={21} {...common} />
          <Line x1={16} y1={6.5} x2={16} y2={17.5} {...common} />
          <Line x1={20} y1={9.5} x2={20} y2={14.5} {...common} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={3.8} {...common} />
          <Path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" {...common} />
        </>
      );
    case 'sliders':
      return (
        <>
          <Line x1={4} y1={8} x2={20} y2={8} {...common} />
          <Circle cx={9.5} cy={8} r={2.1} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Line x1={4} y1={16} x2={20} y2={16} {...common} />
          <Circle cx={14.5} cy={16} r={2.1} fill="none" stroke={color} strokeWidth={strokeWidth} />
        </>
      );
    case 'share':
      return (
        <>
          <Path d="M12 3.5V15" {...common} />
          <Path d="M7.8 7.7 12 3.5l4.2 4.2" {...common} />
          <Path
            d="M7 10.5H5.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H17"
            {...common}
          />
        </>
      );
    case 'trash':
      return (
        <>
          <Path d="M4.5 6.5h15" {...common} />
          <Path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" {...common} />
          <Path
            d="M6.5 6.5 7.3 19a1.8 1.8 0 0 0 1.8 1.7h5.8A1.8 1.8 0 0 0 16.7 19l.8-12.5"
            {...common}
          />
          <Path d="M10 10.5v6M14 10.5v6" {...common} />
        </>
      );
    case 'check':
      return <Path d="M4.5 12.5 9.5 17.5 19.5 6.5" {...common} />;
    case 'close':
      return <Path d="M6 6l12 12M18 6 6 18" {...common} />;
    case 'refresh':
      return (
        <>
          <Path d="M3.5 12a8.5 8.5 0 0 1 14.3-6.2L20.5 8" {...common} />
          <Polyline points="20.5,3 20.5,8 15.5,8" {...common} />
          <Path d="M20.5 12a8.5 8.5 0 0 1-14.3 6.2L3.5 16" {...common} />
          <Polyline points="3.5,21 3.5,16 8.5,16" {...common} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x={5} y={10.5} width={14} height={9.5} rx={2} {...common} />
          <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...common} />
        </>
      );
    case 'sparkle':
      return (
        <>
          <Path
            d="M11 3.5l1.6 4.3a1 1 0 0 0 .6.6l4.3 1.6-4.3 1.6a1 1 0 0 0-.6.6L11 16.5l-1.6-4.3a1 1 0 0 0-.6-.6L4.5 10l4.3-1.6a1 1 0 0 0 .6-.6Z"
            {...common}
          />
          <Path d="M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" {...common} />
        </>
      );
    case 'book':
      return (
        <>
          <Path d="M2.5 4.5H9A3 3 0 0 1 12 7.5V20a2.5 2.5 0 0 0-2.5-2.5h-7V4.5Z" {...common} />
          <Path d="M21.5 4.5H15A3 3 0 0 0 12 7.5V20a2.5 2.5 0 0 1 2.5-2.5h7V4.5Z" {...common} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={2} {...common} />
          <Path d="M3.5 9.5h17M8 3v4M16 3v4" {...common} />
        </>
      );
    case 'target':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Circle cx={12} cy={12} r={5} {...common} />
          <Circle cx={12} cy={12} r={1.3} fill={color} />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <Path d="M4 12h16" {...common} />
          <Polyline points="13.5,5.5 20,12 13.5,18.5" {...common} />
        </>
      );
    case 'warning':
      return (
        <>
          <Path d="M12 3.8 21 19.2a1 1 0 0 1-.86 1.5H3.86A1 1 0 0 1 3 19.2Z" {...common} />
          <Path d="M12 9.5v4.5" {...common} />
          <Circle cx={12} cy={17} r={0.9} fill={color} />
        </>
      );
    case 'volume':
      return (
        <>
          <Path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" {...common} />
          <Path d="M15.5 9.2a4.2 4.2 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8" {...common} />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M3 12h18" {...common} />
          <Path d="M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18Z" {...common} />
        </>
      );
    case 'list':
      return (
        <>
          <Path d="M8.5 6h12M8.5 12h12M8.5 18h12" {...common} />
          <Circle cx={4.5} cy={6} r={0.9} fill={color} />
          <Circle cx={4.5} cy={12} r={0.9} fill={color} />
          <Circle cx={4.5} cy={18} r={0.9} fill={color} />
        </>
      );
    case 'download':
      return (
        <>
          <Path d="M12 3.5V15" {...common} />
          <Path d="M7.8 10.8 12 15l4.2-4.2" {...common} />
          <Path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" {...common} />
        </>
      );
  }
}

export interface IconProps {
  name: IconName;
  /** Square render size in dp; the 24-unit glyph scales inside it. */
  size?: number;
  /** Glyph ink. Defaults to body text ink from the active theme. */
  color?: string;
  strokeWidth?: number;
  /** Icons are decorative by default; label only icon-only controls. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * One themed icon. Decorative by default (hidden from screen readers exactly
 * like the emoji art it replaces); an explicit label promotes it to an image.
 */
export default function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  accessibilityLabel,
  testID,
}: IconProps) {
  const theme = useTheme();
  const ink = color ?? theme.colors.text;
  return (
    <View
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={accessibilityLabel ? undefined : true}
      importantForAccessibility={accessibilityLabel ? undefined : 'no-hide-descendants'}
      testID={testID}
      pointerEvents="none"
      style={styles.host}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyph(name, { color: ink, strokeWidth })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
