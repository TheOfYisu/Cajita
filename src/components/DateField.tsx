import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Label } from './ui';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

function makeDateTs(year: number, month: number, day: number): number {
  const d = new Date(year, month, day, 12, 0, 0, 0);
  return d.getTime();
}

export function DateField({
  label,
  value,
  onChange,
  allowFuture = false,
}: {
  label?: string;
  value: number;
  onChange: (ts: number) => void;
  allowFuture?: boolean;
}) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [pickingMonthYear, setPickingMonthYear] = useState(false);
  const [today] = useState(() => startOfDay(new Date().getTime()));

  const cur = startOfDay(value);
  const curDate = new Date(cur);
  const [viewYear, setViewYear] = useState(() => curDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => curDate.getMonth());

  const isToday = cur === today;
  const isYesterday = cur === today - 86400000;
  const isTomorrow = cur === today + 86400000;

  const formattedDate = curDate.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const displayLabel = isToday
    ? `Hoy · ${formattedDate}`
    : isYesterday
      ? `Ayer · ${formattedDate}`
      : isTomorrow
        ? `Mañana · ${formattedDate}`
        : curDate.toLocaleDateString('es-CO', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

  const handleOpen = () => {
    const d = new Date(startOfDay(value));
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setPickingMonthYear(false);
    setOpen(true);
  };

  const selectTimestamp = (ts: number) => {
    const normalized = startOfDay(ts);
    if (!allowFuture && normalized > today) return;
    onChange(normalized);
    setOpen(false);
  };

  const todayDate = new Date(today);
  const todayYear = todayDate.getFullYear();
  const todayMonth = todayDate.getMonth();

  const canGoNextMonth =
    allowFuture ||
    viewYear < todayYear ||
    (viewYear === todayYear && viewMonth < todayMonth);

  const changeMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1, 12, 0, 0, 0);
    if (!allowFuture) {
      const maxMonthStart = new Date(todayYear, todayMonth, 1, 12, 0, 0, 0).getTime();
      if (d.getTime() > maxMonthStart) return;
    }
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // Build Monday-first calendar grid for (viewYear, viewMonth)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay(): 0 = Sunday .. 6 = Saturday -> convert to 0 = Monday .. 6 = Sunday
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const addMonthsFromToday = (months: number): number => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + months);
    return startOfDay(d.getTime());
  };

  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}

      <Pressable
        onPress={handleOpen}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 11,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          </View>
          <Text
            style={{
              color: colors.text,
              fontWeight: '700',
              fontSize: 14,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>
            Cambiar
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: 18,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={18} color={colors.accent} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                  {label || 'Seleccionar fecha'}
                </Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Quick presets */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Pressable
                onPress={() => selectTimestamp(today)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isToday ? colors.accent : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: isToday ? colors.accent : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isToday ? '#FFFFFF' : colors.text,
                  }}
                >
                  Hoy
                </Text>
              </Pressable>

              <Pressable
                onPress={() => selectTimestamp(today - 86400000)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isYesterday ? colors.accent : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: isYesterday ? colors.accent : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isYesterday ? '#FFFFFF' : colors.text,
                  }}
                >
                  Ayer
                </Text>
              </Pressable>

              {allowFuture ? (
                <>
                  <Pressable
                    onPress={() => selectTimestamp(addMonthsFromToday(1))}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      +1 mes
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => selectTimestamp(addMonthsFromToday(6))}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      +6 meses
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => selectTimestamp(addMonthsFromToday(12))}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      +1 año
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => selectTimestamp(today - 7 * 86400000)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    Hace 1 sem
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Month / Year selector bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: 8,
                paddingVertical: 8,
                marginBottom: 12,
              }}
            >
              <Pressable
                onPress={() =>
                  pickingMonthYear
                    ? setViewYear((y) => y - 1)
                    : changeMonth(-1)
                }
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={() => setPickingMonthYear((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                  {pickingMonthYear
                    ? `${viewYear}`
                    : `${MONTHS[viewMonth]} ${viewYear}`}
                </Text>
                <Ionicons
                  name={pickingMonthYear ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={colors.accent}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  if (pickingMonthYear) {
                    if (!allowFuture && viewYear >= todayYear) return;
                    setViewYear((y) => y + 1);
                  } else {
                    changeMonth(1);
                  }
                }}
                disabled={
                  pickingMonthYear
                    ? !allowFuture && viewYear >= todayYear
                    : !canGoNextMonth
                }
                hitSlop={8}
                style={{
                  padding: 6,
                  opacity: (
                    pickingMonthYear
                      ? allowFuture || viewYear < todayYear
                      : canGoNextMonth
                  )
                    ? 1
                    : 0.3,
                }}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </Pressable>
            </View>

            {pickingMonthYear ? (
              /* Fast Month Picker Grid */
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MONTHS_SHORT.map((mName, mIdx) => {
                  const disabledMonth =
                    !allowFuture &&
                    (viewYear > todayYear ||
                      (viewYear === todayYear && mIdx > todayMonth));
                  const isCurrentMonth = mIdx === viewMonth;
                  return (
                    <Pressable
                      key={mName}
                      disabled={disabledMonth}
                      onPress={() => {
                        setViewMonth(mIdx);
                        setPickingMonthYear(false);
                      }}
                      style={{
                        width: '31%',
                        paddingVertical: 12,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        backgroundColor: isCurrentMonth
                          ? colors.accent
                          : colors.surfaceAlt,
                        opacity: disabledMonth ? 0.3 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          fontSize: 13,
                          color: isCurrentMonth ? '#FFFFFF' : colors.text,
                        }}
                      >
                        {mName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              /* Calendar Day Grid */
              <View>
                {/* Weekday headers */}
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  {WEEKDAYS.map((w, i) => (
                    <View
                      key={`${w}-${i}`}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                    >
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        {w}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Weeks */}
                {rows.map((week, wIdx) => (
                  <View
                    key={`week-${wIdx}`}
                    style={{ flexDirection: 'row', marginBottom: 4 }}
                  >
                    {week.map((day, dIdx) => {
                      if (day === null) {
                        return <View key={`empty-${dIdx}`} style={{ flex: 1, height: 38 }} />;
                      }
                      const cellTs = makeDateTs(viewYear, viewMonth, day);
                      const isSelected = cellTs === cur;
                      const isCellToday = cellTs === today;
                      const isDisabled = !allowFuture && cellTs > today;

                      return (
                        <Pressable
                          key={`day-${day}`}
                          disabled={isDisabled}
                          onPress={() => selectTimestamp(cellTs)}
                          style={{
                            flex: 1,
                            height: 38,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            backgroundColor: isSelected
                              ? colors.accent
                              : 'transparent',
                            borderWidth: isCellToday && !isSelected ? 1.5 : 0,
                            borderColor:
                              isCellToday && !isSelected
                                ? colors.accent
                                : 'transparent',
                            opacity: isDisabled ? 0.28 : 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: isSelected || isCellToday ? '800' : '600',
                              color: isSelected
                                ? '#FFFFFF'
                                : isCellToday
                                  ? colors.accent
                                  : colors.text,
                            }}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
