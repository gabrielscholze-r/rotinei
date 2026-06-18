import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { getItem, KEYS } from '../../lib/storage';
import { KanbanBoard, KanbanColumn } from '../../lib/types';
import { BoardView } from '../../components/kanban/BoardView';

export default function KanbanBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);

  useEffect(() => {
    (async () => {
      const [boards, cols] = await Promise.all([
        getItem<KanbanBoard[]>(KEYS.KANBAN_BOARDS),
        getItem<KanbanColumn[]>(KEYS.KANBAN_COLUMNS),
      ]);
      const found = (boards ?? []).find(b => b.id === id) ?? null;
      setBoard(found);
      setColumns(
        (cols ?? [])
          .filter(c => c.boardId === id)
          .sort((a, b) => a.order - b.order)
      );
    })();
  }, [id]);

  if (!board) return null;
  return <BoardView board={board} columns={columns} />;
}
