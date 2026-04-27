import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path, G, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/colors';

export interface PieSlice {
  key: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
  emoji: string;
}

interface PieChartProps {
  slices: PieSlice[];
  size?: number;
  totalLabel?: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function arcPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
): string {
  const o1 = polarToCartesian(cx, cy, outerR, startAngle);
  const o2 = polarToCartesian(cx, cy, outerR, endAngle);
  const i1 = polarToCartesian(cx, cy, innerR, endAngle);
  const i2 = polarToCartesian(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

export function PieChart({ slices, size = 200, totalLabel }: PieChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.6;

  let angle = -Math.PI / 2;
  const paths: { d: string; color: string }[] = [];

  if (slices.length === 1) {
    const half = Math.PI;
    paths.push({ d: arcPath(cx, cy, outerR, innerR, angle, angle + half), color: slices[0].color });
    paths.push({ d: arcPath(cx, cy, outerR, innerR, angle + half, angle + 2 * half), color: slices[0].color });
  } else {
    for (const slice of slices) {
      const sweep = (slice.percentage / 100) * 2 * Math.PI;
      const end = angle + sweep;
      paths.push({ d: arcPath(cx, cy, outerR, innerR, angle, end), color: slice.color });
      angle = end;
    }
  }

  const total = slices.reduce((s, sl) => s + sl.value, 0);

  if (slices.length === 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={styles.emptyText}>Nenhum dado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ position: 'relative', width: size, height: size }}>
        <Svg width={size} height={size}>
          <G>
            {paths.map((p, i) => (
              <Path key={i} d={p.d} fill={p.color} />
            ))}
          </G>
          <SvgText
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill={Colors.text}
            fontSize="11"
            fontWeight="700"
          >
            {totalLabel ?? formatCurrency(total)}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill={Colors.textSecondary ?? '#64748B'}
            fontSize="9"
          >
            total
          </SvgText>
        </Svg>
      </View>

      <View style={styles.legend}>
        {slices.map((sl) => (
          <View key={sl.key} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: sl.color }]} />
            <Text style={styles.legendEmoji}>{sl.emoji}</Text>
            <Text style={styles.legendLabel} numberOfLines={1}>{sl.label}</Text>
            <Text style={styles.legendPct}>{sl.percentage.toFixed(0)}%</Text>
            <Text style={styles.legendAmt}>{formatCurrency(sl.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  legend: {
    width: '100%',
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendEmoji: {
    fontSize: 13,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
  },
  legendPct: {
    fontSize: 11,
    color: '#64748B',
    width: 30,
    textAlign: 'right',
  },
  legendAmt: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },
});
