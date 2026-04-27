import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Goal, HomeWidget, Note, Routine, RoutineLog, TodoList, Expense, WidgetSize } from '../../lib/types';
import { isRoutineCompletedToday } from '../../lib/routines';
import { ExpenseSummaryWidget } from './widgets/ExpenseSummaryWidget';
import { GoalWidget } from './widgets/GoalWidget';
import { NoteWidget } from './widgets/NoteWidget';
import { RoutineWidget } from './widgets/RoutineWidget';
import { RoutinesTodayWidget } from './widgets/RoutinesTodayWidget';
import { TodoListWidget } from './widgets/TodoListWidget';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - 40;
const SMALL_WIDTH = (CONTENT_WIDTH - 12) / 2;

interface Props {
  widgets: HomeWidget[];
  isEditMode: boolean;
  onReorder: (newWidgets: HomeWidget[]) => void;
  onDelete: (id: string) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  routines: Routine[];
  routineLogs: RoutineLog[];
  todoLists: TodoList[];
  notes: Note[];
  goals: Goal[];
  expenses: Expense[];
  cycleDay: number;
}

export function DraggableWidgetList({
  widgets,
  isEditMode,
  onReorder,
  onDelete,
  onDragStateChange,
  routines,
  routineLogs,
  todoLists,
  notes,
  goals,
  expenses,
  cycleDay,
}: Props) {
  const [localWidgets, setLocalWidgets] = useState(widgets);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const localWidgetsRef = useRef(widgets);
  const itemHeights = useRef<Record<string, number>>({});
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const wobbleRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    localWidgetsRef.current = widgets;
    setLocalWidgets(widgets);
  }, [widgets]);

  useEffect(() => {
    if (isEditMode) {
      wobbleRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: -1, duration: 80, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: 0.5, duration: 80, useNativeDriver: true }),
          Animated.timing(wobbleAnim, { toValue: -0.5, duration: 80, useNativeDriver: true }),
        ])
      );
      wobbleRef.current.start();
    } else {
      wobbleRef.current?.stop();
      wobbleAnim.setValue(0);
    }
    return () => {
      wobbleRef.current?.stop();
    };
  }, [isEditMode]);

  function getWidgetWidth(size: WidgetSize): number {
    return size === 'small' ? SMALL_WIDTH : CONTENT_WIDTH;
  }

  function makePanResponder(widgetId: string) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => isEditMode,
      onMoveShouldSetPanResponder: () => isEditMode,
      onPanResponderGrant: () => {
        setDraggingId(widgetId);
        onDragStateChange?.(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderMove: (_, gestureState) => {
        const current = [...localWidgetsRef.current].sort((a, b) => a.order - b.order);
        const fromIndex = current.findIndex((w) => w.id === widgetId);
        if (fromIndex === -1) return;

        // Compute cumulative Y of each widget
        const ys: number[] = [];
        let acc = 0;
        current.forEach((w) => {
          ys.push(acc);
          acc += (itemHeights.current[w.id] ?? 80) + 12;
        });

        const draggedY = ys[fromIndex] + gestureState.dy;
        const draggedCenter = draggedY + (itemHeights.current[widgetId] ?? 80) / 2;

        let toIndex = fromIndex;
        for (let i = 0; i < current.length; i++) {
          if (i === fromIndex) continue;
          const center = ys[i] + (itemHeights.current[current[i].id] ?? 80) / 2;
          if (
            (i < fromIndex && draggedCenter < center) ||
            (i > fromIndex && draggedCenter > center)
          ) {
            toIndex = i;
          }
        }

        if (toIndex !== fromIndex) {
          const reordered = [...current];
          const [moved] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, moved);
          const updated = reordered.map((w, i) => ({ ...w, order: i }));
          localWidgetsRef.current = updated;
          setLocalWidgets(updated);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: () => {
        setDraggingId(null);
        onDragStateChange?.(false);
        const final = [...localWidgetsRef.current]
          .sort((a, b) => a.order - b.order)
          .map((w, i) => ({ ...w, order: i }));
        onReorder(final);
      },
      onPanResponderTerminate: () => {
        setDraggingId(null);
        onDragStateChange?.(false);
      },
    });
  }

  function renderWidgetContent(widget: HomeWidget) {
    switch (widget.type) {
      case 'routines_today':
        return <RoutinesTodayWidget routines={routines} logs={routineLogs} />;
      case 'routine': {
        const routine = routines.find((r) => r.id === widget.entityId);
        if (!routine) return <MissingWidget label="Rotina removida" />;
        const isCompleted = isRoutineCompletedToday(routine.id, routineLogs);
        return <RoutineWidget routine={routine} isCompleted={isCompleted} size={widget.size} />;
      }
      case 'todo_list': {
        const list = todoLists.find((l) => l.id === widget.entityId);
        if (!list) return <MissingWidget label="Lista removida" />;
        return <TodoListWidget list={list} size={widget.size} />;
      }
      case 'note': {
        const note = notes.find((n) => n.id === widget.entityId);
        if (!note) return <MissingWidget label="Nota removida" />;
        return <NoteWidget note={note} size={widget.size} />;
      }
      case 'goal': {
        const goal = goals.find((g) => g.id === widget.entityId);
        if (!goal) return <MissingWidget label="Meta removida" />;
        return <GoalWidget goal={goal} size={widget.size} />;
      }
      case 'expense_summary':
        return <ExpenseSummaryWidget expenses={expenses} cycleDay={cycleDay} />;
      default:
        return null;
    }
  }

  const sorted = [...localWidgets].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.container}>
      {sorted.map((widget) => {
        const isDragging = draggingId === widget.id;
        const panHandlers = isEditMode ? makePanResponder(widget.id).panHandlers : {};
        const widgetWidth = getWidgetWidth(widget.size);

        const wobbleStyle = isEditMode
          ? {
              transform: [
                {
                  rotate: wobbleAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-1.2deg', '1.2deg'],
                  }),
                },
                ...(isDragging ? [{ scale: 1.04 }] : []),
              ],
            }
          : {};

        return (
          <Animated.View
            key={widget.id}
            style={[
              styles.widgetWrapper,
              { width: widgetWidth },
              wobbleStyle,
              isDragging && styles.draggingWidget,
            ]}
            onLayout={(e) => {
              itemHeights.current[widget.id] = e.nativeEvent.layout.height;
            }}
          >
            {renderWidgetContent(widget)}

            {isEditMode && (
              <>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onDelete(widget.id);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>

                <View style={styles.dragHandle} {...panHandlers}>
                  <Text style={styles.dragHandleIcon}>⠿</Text>
                </View>
              </>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

function MissingWidget({ label }: { label: string }) {
  return (
    <View style={styles.missingWidget}>
      <Text style={styles.missingText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  widgetWrapper: {
    position: 'relative',
  },
  draggingWidget: {
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  deleteBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dragHandle: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dragHandleIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  missingWidget: {
    backgroundColor: Colors.borderLight,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  missingText: { fontSize: 13, color: Colors.textTertiary },
});
